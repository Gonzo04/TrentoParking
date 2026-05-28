import { useCallback, useMemo, useState, useEffect } from 'react';
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

/* ── Utility ─────────────────────────────────────────────────────── */
function distanceM(lat1, lon1, lat2, lon2) {
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

  /* ── Spots ───────────────────────────────────────────────────────── */
  // Registra ogni cambio di view nella cronologia del browser
  useEffect(() => {
    if (!resetToken) {
      window.history.pushState({ view }, '', '');
    }
  }, [view, resetToken]);

  // Gestisce il tasto "indietro" del browser/mouse
  useEffect(() => {
    function handlePopState(event) {
      const previousView = event.state?.view;
      if (!previousView) { setView('landing'); return; }
      // Se l'utente non è loggato non può tornare a view autenticate
      if (!authenticatedUser && (previousView === 'dashboard' || previousView === 'payment' || previousView === 'myBookings')) {
        setView('landing');
        return;
      }
      setView(previousView);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authenticatedUser]);

  const loadPostiPrivati = useCallback(async () => {
    const posti = await api.listPosti();
    setSpots(posti);
    return posti;
  }, []);

  /* ── Auth cambio ─────────────────────────────────────────────────── */
  const handleAuthChange = useCallback((user) => {
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
    setIsCreateSpotMode(true);
    setCreateSpotMessage('');
    setCreateSpotError('');
    setSearchCircle(null);
  }

  /* ── Spot detail ─────────────────────────────────────────────────── */
  async function handleSelectSpot(spotId) {
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
    setPendingBooking(null);
    setView('dashboard');
    try { await loadPostiPrivati(); } catch (e) { console.error(e); }
  }

  function handlePayFromBookings(booking) {
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
    const { name, value, type, checked } = event.target;
    setNewSpotForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleCreatePrivateSpot(event) {
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
        // ma <input type="time"> restituisce stringhe tipo "08:00" → convertiamo
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

  /* Profilo utente (placeholder — pagina completa da sviluppare) */
  if (view === 'profile' && authenticatedUser) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f6f7', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ height: 64, background: '#003049', display: 'flex', alignItems: 'center', padding: '0 1.75rem', gap: '1rem' }}>
          <button
            onClick={() => setView('dashboard')}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.88)', padding: '0.45rem 1rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.04em' }}>
            <span style={{ color: '#fff' }}>Trento</span>
            <span style={{ color: '#2a9d8f' }}>Parking</span>
          </span>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '3rem 2.5rem', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,48,73,0.09)', maxWidth: 420, width: '100%' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 1rem' }}>🚀</p>
            <h2 style={{ fontFamily: 'Sora, sans-serif', color: '#003049', margin: '0 0 0.5rem', fontSize: '1.5rem', letterSpacing: '-0.03em' }}>
              Profilo in arrivo
            </h2>
            <p style={{ color: '#4a5568', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              La pagina di gestione profilo è in fase di sviluppo. Presto potrai modificare i tuoi dati, la targa e vedere le tue statistiche.
            </p>
            <button
              onClick={() => setView('dashboard')}
              style={{ background: '#2a9d8f', color: 'white', border: 'none', borderRadius: 10, padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Torna alla dashboard
            </button>
          </div>
        </div>
      </div>
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