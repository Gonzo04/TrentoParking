import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { api } from './services/api';
import { logoutUser } from './services/authService';
import LandingPage from './components/LandingPage';
import AuthPanel from './components/AuthPanel';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import BookingCalendar from './components/BookingCalendar';
import PaymentPage from './components/PaymentPage';
import MyBookings from './components/MyBookings';
import ProfilePage from './components/ProfilePage';

/* ── Utility ─────────────────────────────────────────────────────── */
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

/* ── App ─────────────────────────────────────────────────────────── */
function App() {
  // 'landing' | 'auth' | 'dashboard' | 'payment' | 'myBookings'
  const [view, setView] = useState('landing');

  // auth
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  // auth panel: tab iniziale ('login' | 'register')
  const [authInitialTab, setAuthInitialTab] = useState('login');

  // spots
  const [spots, setSpots] = useState([]);
  const [spotDetail, setSpotDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // booking / payment
  const [pendingBooking, setPendingBooking] = useState(null);

  // email verification
  const [waitingVerification, setWaitingVerification] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // reset password
  const [resetSuccess, setResetSuccess] = useState(false);

  // map
  const [searchCircle, setSearchCircle] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  // create spot
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

  /* ── Reset password dal link email ──────────────────────────────── */
  const path = window.location.pathname;
  const resetToken = path.startsWith('/reset-password/')
    ? path.split('/reset-password/')[1]
    : null;

  useEffect(() => {
    // Legge eventuali parametri presenti nell'URL dopo verifica email o reset password
    // Dopo averli letti puliamo l'URL per evitare messaggi ripetuti al refresh
    const params = new URLSearchParams(window.location.search);

    if (params.get('verified') === 'true') {
      setVerificationSuccess(true);
      window.history.replaceState({}, document.title, '/');
      // porta l'utente alla pagina auth con messaggio di successo
      setView('auth');
    }

    if (params.get('reset') === 'success') {
      setResetSuccess(true);
      setView('auth');
    }

    // se c'è un token di reset nel path, vai subito all'auth
    if (resetToken) {
      setView('auth');
    }
  }, [resetToken]);

  // isPopStateNavigation blocca il pushState quando il cambio view viene da popstate
  // currentViewRef serve per confrontare la view corrente dentro il handler senza dipendenze
  const isPopStateNavigation = useRef(false);
  const currentViewRef       = useRef('landing');

  // Tiene sincronizzato currentViewRef ad ogni cambio di view
  useEffect(() => { currentViewRef.current = view; }, [view]);

  /* ── Spots ───────────────────────────────────────────────────────── */
  // Registra ogni cambio di view nella cronologia del browser
  useEffect(() => {
    if (isPopStateNavigation.current) {
      isPopStateNavigation.current = false;
      return;
    }
    if (!resetToken) {
      window.history.pushState({ view }, '', '');
    }
  }, [view, resetToken]);

  // Gestisce il tasto "indietro" del browser/mouse
  useEffect(() => {
    function handlePopState(event) {
      const targetView = event.state?.view ?? 'landing';

      // Calcola la view effettiva verso cui navigare
      let newView = targetView;

      // Un utente già autenticato non può tornare alla view 'auth'.
      if (authenticatedUser && newView === 'auth') {
        newView = 'landing';
      }

      // Un utente non autenticato non può raggiungere view protette via back
      if (!authenticatedUser && ['dashboard', 'payment', 'myBookings', 'profile'].includes(newView)) {
        newView = 'landing';
      }

      // Imposta il flag SOLO se la view cambierà davvero.
      if (newView !== currentViewRef.current) {
        isPopStateNavigation.current = true;
      }

      setView(newView);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authenticatedUser]);

  const loadPostiPrivati = useCallback(async () => {
    // Carica i posti privati visibili sulla mappa
    // Questa funzione viene riusata dopo creazione, modifica o eliminazione di un posto
    const posti = await api.listPosti();
    setSpots(posti);
    return posti;
  }, []);

  /* ── Auth cambio ─────────────────────────────────────────────────── */
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
      // Torna alla landing solo se era in una view autenticata,
      // non se è già in 'landing' o 'auth'
      setView(prev =>
        prev === 'dashboard' || prev === 'payment' || prev === 'myBookings'
          ? 'landing'
          : prev
      );
    }
  }, [loadPostiPrivati]);

  /* ── Logout ──────────────────────────────────────────────────────── */
  async function handleLogout() {
    try {
      const token = localStorage.getItem('authToken');
      if (token) await logoutUser(token);
    } catch {
      // facciamo logout locale nel caso il backend fallisca
    } finally {
      localStorage.removeItem('authToken');
      handleAuthChange(null);
    }
  }

  /* ── Create spot helpers ─────────────────────────────────────────── */
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

  /* ── Spot detail ─────────────────────────────────────────────────── */
  async function handleSelectSpot(spotId) {
    // Carica dettaglio del posto e prenotazioni future
    // Se il posto è di un altro host verrà mostrato il calendario
    // Se il posto è dell'utente loggato verrà mostrato il pannello di gestione
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

  /* ── Booking / payment ───────────────────────────────────────────── */
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
    // Dopo il pagamento torniamo alla mappa e ricarichiamo i posti
    setPendingBooking(null);
    setView('dashboard');
    try { await loadPostiPrivati(); } catch (e) { console.error(e); }
  }

  function handlePayFromBookings(booking) {
    // Permette di pagare una prenotazione rimasta in attesa dalla pagina Le mie prenotazioni
    setPendingBooking(booking);
    setView('payment');
  }

  /* ── Map interactions ────────────────────────────────────────────── */
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
    setSearchCircle(c => ({ lat: latlng.lat, lng: latlng.lng, radiusM: c?.radiusM ?? 500 }));
  }

  function handleSearchSelect({ lat, lng }) {
    setFlyTarget({ lat, lng });
    setSearchCircle(c => ({ lat, lng, radiusM: c?.radiusM ?? 500 }));
    if (isCreateSpotMode) setCreateSpotPosition({ lat, lng });
  }

  function handleRadiusChange(radiusM) {
    setSearchCircle(c => c ? { ...c, radiusM } : null);
  }

  function handleNewSpotFormChange(event) {
    // Gestisce sia gli input normali sia le checkbox dei giorni di disponibilità
    const { name, value, type, checked } = event.target;
    setNewSpotForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
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
    if (!newSpotForm.nome.trim()) { setCreateSpotError('Inserisci un nome per il posto auto'); return; }
    if (!Number.isFinite(tariffa) || tariffa < 0) { setCreateSpotError('Inserisci una tariffa oraria valida'); return; }
    if (!newSpotForm.dichiarazioneProprietaAccettata) {
      setCreateSpotError('Devi dichiarare di essere proprietario o autorizzato a pubblicare il posto');
      return;
    }

    setCreateSpotLoading(true);
    try {
      await api.createPostoPrivato({
        nome: newSpotForm.nome.trim(),
        descrizione: newSpotForm.descrizione.trim(),
        posizione: {
          latitudine: createSpotPosition.lat,
          longitudine: createSpotPosition.lng,
          indirizzoTestuale: newSpotForm.indirizzoTestuale.trim(),
        },
        tariffaOraria: tariffa,
        // Il backend si aspetta oraInizio/oraFine come interi (0-24),
        // ma <input type="time"> restituisce stringhe tipo "08:00" quindi lo convertiamo
        disponibilita: newSpotForm.disponibilita.map(d => ({
          giorno: d.giorno,
          oraInizio: parseInt(d.oraInizio.split(':')[0], 10),
          oraFine:   parseInt(d.oraFine.split(':')[0],   10),
        })),
        caratteristiche: newSpotForm.caratteristiche,
        dichiarazioneProprietaAccettata: true,
      });
      await loadPostiPrivati();
      const data = await api.me();
      setAuthenticatedUser(data.user);
      setCreateSpotMessage('Posto auto privato pubblicato correttamente');
      resetCreateSpotState();
      setCreateSpotMessage('Posto auto privato pubblicato correttamente');
    } catch (error) {
      setCreateSpotError(error.message);
    } finally {
      setCreateSpotLoading(false);
    }
  }

  /* ── Spots vicini ────────────────────────────────────────────────── */
  const nearbySpots = useMemo(() => {
    if (!searchCircle) return spots;
    return spots.filter(spot =>
      spot.posizione &&
      Number.isFinite(Number(spot.posizione.latitudine)) &&
      Number.isFinite(Number(spot.posizione.longitudine)) &&
      distanceM(
        searchCircle.lat, searchCircle.lng,
        Number(spot.posizione.latitudine), Number(spot.posizione.longitudine)
      ) <= searchCircle.radiusM
    );
  }, [spots, searchCircle]);

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */

  /* Landing page pubblica */
  if (view === 'landing') {
    return (
      <LandingPage
        onLogin={() => { setAuthInitialTab('login'); setView('auth'); }}
        onRegister={() => { setAuthInitialTab('register'); setView('auth'); }}
      />
    );
  }

  /* Pagina di autenticazione (login / registrazione / reset password) */
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

  /* Profilo utente */
  if (view === 'profile' && authenticatedUser) {
    return (
      <ProfilePage
        authenticatedUser={authenticatedUser}
        onBack={() => { loadPostiPrivati().catch(console.error); setView('dashboard'); }}
        onUpdateUser={(updatedUser) => setAuthenticatedUser(updatedUser)}
      />
    );
  }

  /* Payment */
  if (view === 'payment' && authenticatedUser && pendingBooking) {
    return (
      <div className="app-page">
        <main className="main-layout">
          <AuthPanel onAuthChange={handleAuthChange} />
          <PaymentPage
            booking={pendingBooking}
            onDone={handlePaymentDone}
            onCancel={() => { setView('dashboard'); setPendingBooking(null); }}
          />
        </main>
      </div>
    );
  }

  /* My Bookings */
  if (view === 'myBookings' && authenticatedUser) {
    return (
      <MyBookings
        onBack={() => setView('dashboard')}
        onPay={handlePayFromBookings}
      />
    );
  }

  /* Dashboard principale */
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
      onLogout={handleLogout}
      onMyBookings={() => setView('myBookings')}
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
    />
  );
}

export default App;