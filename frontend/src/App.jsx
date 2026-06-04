import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import ProfilePage from './pages/ProfilePage'

import ResetPassword from './features/auth/ResetPassword'
import VerificaMail from './features/auth/VerificaMail'

import MyBookings from './features/bookings/MyBookings'
import MyReceivedBookings from './features/bookings/MyReceivedBookings'
import PaymentPage from './features/bookings/PaymentPage'

import HostReviewsPage from './features/reviews/HostReviewsPage'

import { api } from './services/api'
import { logoutUser } from './services/authService'

function distanceM(lat1, lon1, lat2, lon2) {
  // Calcola la distanza approssimata tra due coordinate geografiche
  // Serve per filtrare i posti vicini al punto cercato dall'utente
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat, lng) {
  // Converte le coordinate selezionate sulla mappa in un indirizzo testuale
  // Lo usiamo per aiutare l'host a compilare automaticamente il riferimento del posto
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    addressdetails: '1',
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
  );

  if (!response.ok) throw new Error('Impossibile recuperare l\'indirizzo');

  const data = await response.json();

  if (data.address) {
    const road = data.address.road || data.address.pedestrian || data.address.footway || '';
    const houseNumber = data.address.house_number || '';
    const city = data.address.city || data.address.town || data.address.village || '';

    return [road, houseNumber, city].filter(Boolean).join(', ') || data.display_name || '';
  }

  return data.display_name || '';
}

function App() {
  // 'landing' | 'auth' | 'dashboard' | 'payment' | 'myBookings' | 'receivedBookings' | 'profile' | 'hostReviews'
  const [view, setView] = useState('landing');
  const [reviewHostId, setReviewHostId] = useState(null);
  const [reviewPosto, setReviewPosto]   = useState(null); // { _id, nome, posizione }
  const [authChecked, setAuthChecked] = useState(false);

  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [authInitialTab, setAuthInitialTab] = useState('login');

  const [spots, setSpots] = useState([]);
  const [spotDetail, setSpotDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [pendingBooking, setPendingBooking] = useState(null);

  const [waitingVerification, setWaitingVerification] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const [resetSuccess, setResetSuccess] = useState(false);

  const [searchCircle, setSearchCircle] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  const [isCreateSpotMode, setIsCreateSpotMode] = useState(false);
  const [createSpotPosition, setCreateSpotPosition] = useState(null);
  const [createSpotLoading, setCreateSpotLoading] = useState(false);
  const [createSpotMessage, setCreateSpotMessage] = useState('');
  const [createSpotError, setCreateSpotError] = useState('');

  const [newSpotForm, setNewSpotForm] = useState({
    nome: '',
    descrizione: '',
    indirizzoTestuale: '',
    tariffaOraria: '',
    dichiarazioneProprietaAccettata: false,
    caratteristiche: [],
    disponibilita: [],
  });
  const [photoFiles, setPhotoFiles] = useState([]);

  const path = window.location.pathname;
  const resetToken = path.startsWith('/reset-password/')
    ? path.split('/reset-password/')[1]
    : null;

  const shouldSkipSessionRestore = Boolean(resetToken) ||
    window.location.search.includes('verified=true') ||
    window.location.search.includes('reset=success');

  useEffect(() => {
    // Legge eventuali parametri presenti nell'URL dopo verifica email o reset password
    // Dopo averli letti puliamo l'URL per evitare messaggi ripetuti al refresh
    const params = new URLSearchParams(window.location.search);

    if (params.get('verified') === 'true') {
      setVerificationSuccess(true);
      window.history.replaceState({}, document.title, '/');
      setView('auth');
    }

    if (params.get('reset') === 'success') {
      setResetSuccess(true);
      setView('auth');
    }

    if (resetToken) {
      setView('auth');
    }
  }, [resetToken]);

  const isPopStateNavigation = useRef(false);
  const currentViewRef = useRef('landing');

  useEffect(() => {
    currentViewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (isPopStateNavigation.current) {
      isPopStateNavigation.current = false;
      return;
    }

    if (!resetToken) {
      window.history.pushState({ view }, '', '');
    }
  }, [view, resetToken]);

  useEffect(() => {
    function handlePopState(event) {
      const targetView = event.state?.view ?? 'landing';
      let newView = targetView;

      if (authenticatedUser && newView === 'auth') {
        newView = 'landing';
      }

      if (
        !authenticatedUser &&
        ['dashboard', 'payment', 'myBookings', 'receivedBookings', 'profile', 'hostReviews'].includes(newView)
      ) {
        newView = 'landing';
      }

      if (newView !== currentViewRef.current) {
        isPopStateNavigation.current = true;
      }

      setView(newView);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authenticatedUser]);

  const loadPostiPrivati = useCallback(async () => {
    // Carica i posti privati visibili sulla mappa e mostra la media delle recensioni
    const [posti, medie] = await Promise.all([
      api.listPosti(),
      api.getMediaPosti().catch(() => []),
    ]);
    const medieMap = Object.fromEntries(medie.map(m => [String(m._id), m]));
    const postiArricchiti = posti.map(p => {
      const stat = medieMap[String(p._id)];
      return stat ? { ...p, mediaStelle: stat.media, totaleRecensioni: stat.totale } : p;
    });
    setSpots(postiArricchiti);
    return postiArricchiti;
  }, []);

  function resetCreateSpotState() {
    // Riporta il form di pubblicazione allo stato iniziale
    // Serve dopo annullamento o pubblicazione completata
    setIsCreateSpotMode(false);
    setCreateSpotPosition(null);
    setCreateSpotMessage('');
    setCreateSpotError('');

    setNewSpotForm({
      nome: '',
      descrizione: '',
      indirizzoTestuale: '',
      tariffaOraria: '',
      dichiarazioneProprietaAccettata: false,
      caratteristiche: [],
      disponibilita: [],
    });
    setPhotoFiles([]);
  }

  const handleAuthChange = useCallback((user) => {
    // Aggiorna lo stato dell'utente quando avviene login, logout o refresh del profilo
    setAuthenticatedUser(user);

    if (user) {
      loadPostiPrivati().catch(console.error);
      setView('dashboard');
    } else {
      setSpots([]);
      setSpotDetail(null);
      setPendingBooking(null);
      setSearchCircle(null);
      setFlyTarget(null);
      resetCreateSpotState();

      setView(prev =>
        prev === 'dashboard' ||
        prev === 'payment' ||
        prev === 'myBookings' ||
        prev === 'receivedBookings' ||
        prev === 'profile' ||
        prev === 'hostReviews'
          ? 'landing'
          : prev
      );
    }
  }, [loadPostiPrivati]);

  useEffect(() => {
    // Se esiste già un token valido, ripristiniamo la sessione dopo il refresh
    // Così l'utente loggato non viene riportato inutilmente alla landing page
    let cancelled = false;

    async function restoreSession() {
      if (shouldSkipSessionRestore) {
        setAuthChecked(true);
        return;
      }

      const token = localStorage.getItem('authToken');

      if (!token) {
        setAuthChecked(true);
        return;
      }

      try {
        const data = await api.me();

        if (!cancelled) {
          handleAuthChange(data.user);
        }
      } catch {
        localStorage.removeItem('authToken');

        if (!cancelled) {
          setAuthenticatedUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [handleAuthChange, shouldSkipSessionRestore]);

  function handleViewHostReviews(hostId) {
    setReviewHostId(String(hostId))
    setReviewPosto(null)
    setView('hostReviews')
  }

  function handleViewPostoReviews(posto) {
    setReviewPosto(posto)
    setReviewHostId(null)
    setView('hostReviews')
  }

  async function handleLogout() {
    try {
      const token = localStorage.getItem('authToken');

      if (token) {
        await logoutUser(token);
      }
    } catch {
      // Facciamo logout locale nel caso il backend fallisca
    } finally {
      localStorage.removeItem('authToken');
      handleAuthChange(null);
    }
  }

  function handleDisponibilitaChange(disponibilita) {
    setNewSpotForm(f => ({ ...f, disponibilita }));
  }

  function handleCaratteristicheChange(caratteristiche) {
    setNewSpotForm(f => ({ ...f, caratteristiche }));
  }

  async function handleCreateSpotAddressSelect({ lat, lng }) {
    setCreateSpotPosition({ lat, lng });
    setFlyTarget({ lat, lng });
    setCreateSpotError('');

    try {
      const indirizzo = await reverseGeocode(lat, lng);
      setNewSpotForm(f => ({ ...f, indirizzoTestuale: indirizzo }));
    } catch {
      setNewSpotForm(f => ({ ...f, indirizzoTestuale: '' }));
    }
  }

  function startCreateSpotMode() {
    // Attiva la modalità in cui il click sulla mappa serve per scegliere il punto del posto
    setIsCreateSpotMode(true);
    setCreateSpotMessage('');
    setCreateSpotError('');
    setSearchCircle(null);
  }

  async function handleSelectSpot(spotId) {
    // Carica dettaglio del posto e prenotazioni future
    // Se il posto è di un altro host verrà mostrato il calendario
    setDetailLoading(true);
    setSpotDetail(null);

    try {
      const data = await api.getPostoConPrenotazioni(spotId);
      setSpotDetail(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleBookingConfirm(params) {
    // Crea una prenotazione sul posto selezionato
    // Dopo la creazione l'utente viene mandato alla pagina di pagamento mock
    try {
      const booking = await api.createBooking({
        postoPrivatoId: spotDetail.posto._id || spotDetail.posto.id,
        ...params,
      });

      booking.postoPrivatoId = spotDetail.posto;

      setPendingBooking(booking);
      setSpotDetail(null);
      setView('payment');
    } catch (error) {
      alert(error.message);
    }
  }

  async function handlePaymentDone() {
    const fromMyBookings = pendingBooking?._fromMyBookings;
    setPendingBooking(null);
    setView(fromMyBookings ? 'myBookings' : 'dashboard');

    try {
      await loadPostiPrivati();
    } catch (e) {
      console.error(e);
    }
  }

  function handlePayFromBookings(booking) {
    // Permette di pagare una prenotazione rimasta in attesa dalla pagina Le mie prenotazioni
    setPendingBooking({ ...booking, _fromMyBookings: true });
    setView('payment');
  }

  async function handleMapClick(latlng) {
    if (isCreateSpotMode) {
      setCreateSpotPosition({ lat: latlng.lat, lng: latlng.lng });
      setCreateSpotError('');

      try {
        const indirizzo = await reverseGeocode(latlng.lat, latlng.lng);
        setNewSpotForm(f => ({ ...f, indirizzoTestuale: indirizzo }));
      } catch {
        setNewSpotForm(f => ({ ...f, indirizzoTestuale: '' }));
      }

      return;
    }

    setSearchCircle(c => ({
      lat: latlng.lat,
      lng: latlng.lng,
      radiusM: c?.radiusM ?? 500,
    }));
  }

  function handleSearchSelect({ lat, lng }) {
    setFlyTarget({ lat, lng });
    setSearchCircle(c => ({ lat, lng, radiusM: c?.radiusM ?? 500 }));

    if (isCreateSpotMode) {
      setCreateSpotPosition({ lat, lng });
    }
  }

  function handleRadiusChange(radiusM) {
    setSearchCircle(c => c ? { ...c, radiusM } : null);
  }

  function handleNewSpotFormChange(event) {
    // Gestisce sia gli input normali sia le checkbox
    const { name, value, type, checked } = event.target;

    setNewSpotForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleCreatePrivateSpot(event) {
    // Valida i dati del form e crea un nuovo posto privato tramite API
    // L'hostId non viene mai mandato dal frontend perché lo decide il backend dal token
    event.preventDefault();
    setCreateSpotMessage('');
    setCreateSpotError('');

    if (!createSpotPosition) {
      setCreateSpotError('Clicca sulla mappa per scegliere il punto esatto del posto auto');
      return;
    }

    const tariffa = Number(newSpotForm.tariffaOraria);

    if (!newSpotForm.nome.trim()) {
      setCreateSpotError('Inserisci un nome per il posto auto');
      return;
    }

    if (!Number.isFinite(tariffa) || tariffa < 0) {
      setCreateSpotError('Inserisci una tariffa oraria valida');
      return;
    }

    if (!newSpotForm.dichiarazioneProprietaAccettata) {
      setCreateSpotError('Devi dichiarare di essere proprietario o autorizzato a pubblicare il posto');
      return;
    }

    setCreateSpotLoading(true);

    try {
      const posto = await api.createPostoPrivato({
        nome: newSpotForm.nome.trim(),
        descrizione: newSpotForm.descrizione.trim(),
        posizione: {
          latitudine: createSpotPosition.lat,
          longitudine: createSpotPosition.lng,
          indirizzoTestuale: newSpotForm.indirizzoTestuale.trim(),
        },
        tariffaOraria: tariffa,
        disponibilita: newSpotForm.disponibilita.map(d => ({
          giorno: d.giorno,
          oraInizio: parseInt(d.oraInizio.split(':')[0], 10),
          oraFine: parseInt(d.oraFine.split(':')[0], 10),
        })),
        caratteristiche: newSpotForm.caratteristiche,
        dichiarazioneProprietaAccettata: true,
      });

      if (photoFiles.length > 0) {
        await api.uploadFoto(posto._id, photoFiles);
      }

      await loadPostiPrivati();

      const data = await api.me();
      setAuthenticatedUser(data.user);

      resetCreateSpotState();
      setCreateSpotMessage('Posto auto privato pubblicato correttamente');
    } catch (error) {
      setCreateSpotError(error.message);
    } finally {
      setCreateSpotLoading(false);
    }
  }

  const nearbySpots = useMemo(() => {
    if (!searchCircle) return spots;

    return spots.filter(spot =>
      spot.posizione &&
      Number.isFinite(Number(spot.posizione.latitudine)) &&
      Number.isFinite(Number(spot.posizione.longitudine)) &&
      distanceM(
        searchCircle.lat,
        searchCircle.lng,
        Number(spot.posizione.latitudine),
        Number(spot.posizione.longitudine)
      ) <= searchCircle.radiusM
    );
  }, [spots, searchCircle]);

  if (!authChecked && !shouldSkipSessionRestore) {
    return (
      <div className="app-page">
        <main className="main-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p>Caricamento sessione...</p>
        </main>
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onLogin={() => {
          setAuthInitialTab('login');
          setView('auth');
        }}
        onRegister={() => {
          setAuthInitialTab('register');
          setView('auth');
        }}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthPage
        authInitialTab={authInitialTab}
        onAuthChange={handleAuthChange}
        verificationSuccess={verificationSuccess}
        resetSuccess={resetSuccess}
        waitingVerification={waitingVerification}
        pendingEmail={pendingEmail}
        resetToken={resetToken}
        onBack={() => setView('landing')}
        onRegisterSuccess={(email) => {
          setPendingEmail(email);
          setWaitingVerification(true);
        }}
      />
    );
  }

  if (view === 'profile' && authenticatedUser) {
    return (
      <ProfilePage
        authenticatedUser={authenticatedUser}
        onBack={() => {
          loadPostiPrivati().catch(console.error);
          setView('dashboard');
        }}
        onUpdateUser={(updatedUser) => setAuthenticatedUser(updatedUser)}
        onViewPostoReviews={handleViewPostoReviews}
      />
    );
  }

  if (view === 'payment' && authenticatedUser && pendingBooking) {
    return (
      <PaymentPage
        booking={pendingBooking}
        onPaid={handlePaymentDone}
        onBack={() => {
          setView(pendingBooking._fromMyBookings ? 'myBookings' : 'dashboard');
          setPendingBooking(null);
        }}
      />
    );
  }

  if (view === 'hostReviews' && (reviewHostId || reviewPosto)) {
    return (
      <HostReviewsPage
        hostId={reviewHostId}
        posto={reviewPosto}
        onBack={() => history.back()}
      />
    );
  }

  if (view === 'myBookings' && authenticatedUser) {
    return (
      <MyBookings
        onBack={() => setView('dashboard')}
        onPay={handlePayFromBookings}
        onViewHostReviews={handleViewHostReviews}
        currentUserId={authenticatedUser?.id}
      />
    );
  }

  if (view === 'receivedBookings' && authenticatedUser?.ruolo === 'HOST') {
    return <MyReceivedBookings onBack={() => setView('dashboard')} currentUserId={authenticatedUser?.id} />;
  }

  return (
    <Dashboard
      authenticatedUser={authenticatedUser}
      spots={spots}
      nearbySpots={nearbySpots}
      searchCircle={searchCircle}
      flyTarget={flyTarget}
      detailLoading={detailLoading}
      isCreateSpotMode={isCreateSpotMode}
      createSpotPosition={createSpotPosition}
      createSpotLoading={createSpotLoading}
      createSpotMessage={createSpotMessage}
      createSpotError={createSpotError}
      newSpotForm={newSpotForm}
      spotDetail={spotDetail}
      photoFiles={photoFiles}
      onPhotoFilesChange={files => setPhotoFiles(files)}
      onLogout={handleLogout}
      onMyBookings={() => setView('myBookings')}
      onReceivedBookings={() => setView('receivedBookings')}
      onProfileClick={() => setView('profile')}
      onSearchSelect={handleSearchSelect}
      onRadiusChange={handleRadiusChange}
      onClearSearch={() => setSearchCircle(null)}
      onSelectSpot={handleSelectSpot}
      onMapClick={handleMapClick}
      onStartCreateSpot={startCreateSpotMode}
      onCancelCreateSpot={resetCreateSpotState}
      onNewSpotFormChange={handleNewSpotFormChange}
      onCreateSpot={handleCreatePrivateSpot}
      onCreateSpotAddressSelect={handleCreateSpotAddressSelect}
      onDisponibilitaChange={handleDisponibilitaChange}
      onCaratteristicheChange={handleCaratteristicheChange}
      onCloseDetail={() => setSpotDetail(null)}
      onBookingConfirm={handleBookingConfirm}
      onViewHostReviews={handleViewHostReviews}
      onViewPostoReviews={handleViewPostoReviews}
    />
  );
}

export default App;           