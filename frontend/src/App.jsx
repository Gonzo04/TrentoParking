import { useCallback, useMemo, useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { api } from './services/api';
import AuthPanel from './components/AuthPanel';
import SearchBar from './components/SearchBar';
import SpotMap from './components/SpotMap';
import SpotSidebar from './components/SpotSidebar';
import BookingCalendar from './components/BookingCalendar';
import PaymentPage from './components/PaymentPage';
import MyBookings from './components/MyBookings';
import EmailVerificationPage from './components/VerificaMail';
import ResetPasswordPage from './components/ResetPassword';

function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
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
    addressdetails: '1'
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Impossibile recuperare l indirizzo dalle coordinate');
  }

  const data = await response.json();

  if (data.address) {
    const road = data.address.road || data.address.pedestrian || data.address.footway || '';
    const houseNumber = data.address.house_number || '';
    const city = data.address.city || data.address.town || data.address.village || '';

    const shortAddress = [road, houseNumber, city]
      .filter(Boolean)
      .join(', ');

    return shortAddress || data.display_name || '';
  }

  return data.display_name || '';
}
function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [view, setView] = useState('map');
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
    dichiarazioneProprietaAccettata: false
  });
  const [photoFiles, setPhotoFiles] = useState([]);

  const path = window.location.pathname;
  const resetToken = path.startsWith('/reset-password/')
    ? path.split('/reset-password/')[1]
    : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('verified') === 'true') {
      setVerificationSuccess(true);
      window.history.replaceState({}, document.title, '/');
    }

    if (params.get('reset') === 'success') {
      setResetSuccess(true);
    }
  }, []);

  const loadPostiPrivati = useCallback(async () => {
    const posti = await api.listPosti();
    setSpots(posti);
    return posti;
  }, []);

  const handleAuthChange = useCallback((user) => {
    setAuthenticatedUser(user);

    if (user) {
      loadPostiPrivati().catch(console.error);
    } else {
      setSpots([]);
      setView('map');
      setSpotDetail(null);
      setPendingBooking(null);
      setSearchCircle(null);
      setFlyTarget(null);
      resetCreateSpotState();
    }
  }, [loadPostiPrivati]);

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
      dichiarazioneProprietaAccettata: false
    });
    setPhotoFiles([]);
  }

  function startCreateSpotMode() {
    setIsCreateSpotMode(true);
    setCreateSpotMessage('');
    setCreateSpotError('');
    setSearchCircle(null);
  }

  function cancelCreateSpotMode() {
    resetCreateSpotState();
  }

  async function handleSelectSpot(spotId) {
    setDetailLoading(true);
    setSpotDetail(null);

    try {
      const [data, recensioniData] = await Promise.all([
        api.getPostoConPrenotazioni(spotId),
        api.getRecensioni(spotId),
      ]);
      setSpotDetail({ ...data, recensioni: recensioniData.recensioni, mediaVoti: recensioniData.media });
    } catch (error) {
      alert(error.message);
    } finally {
      setDetailLoading(false);
    }
  }

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
    setView('map');

    try {
      await loadPostiPrivati();
    } catch (error) {
      console.error(error);
    }
  }

  function handlePayFromBookings(booking) {
    setPendingBooking(booking);
    setView('payment');
  }

  async function handleMapClick(latlng) {
  if (isCreateSpotMode) {
    setCreateSpotPosition({
      lat: latlng.lat,
      lng: latlng.lng
    });

    setCreateSpotError('');

    try {
      const indirizzo = await reverseGeocode(latlng.lat, latlng.lng);

      setNewSpotForm((currentForm) => ({
        ...currentForm,
        indirizzoTestuale: indirizzo
      }));
    } catch (error) {
      console.error(error);

      setNewSpotForm((currentForm) => ({
        ...currentForm,
        indirizzoTestuale: ''
      }));
    }

    return;
  }

  setSearchCircle((currentCircle) => ({
    lat: latlng.lat,
    lng: latlng.lng,
    radiusM: currentCircle?.radiusM ?? 500
  }));
}

  function handleSearchSelect({ lat, lng }) {
    const target = { lat, lng };

    setFlyTarget(target);
    setSearchCircle((currentCircle) => ({
      lat,
      lng,
      radiusM: currentCircle?.radiusM ?? 500
    }));

    if (isCreateSpotMode) {
      setCreateSpotPosition(target);
    }
  }

  function handleRadiusChange(radiusM) {
    setSearchCircle((currentCircle) => (
      currentCircle ? { ...currentCircle, radiusM } : null
    ));
  }

  function handleNewSpotFormChange(event) {
    const { name, value, type, checked } = event.target;

    setNewSpotForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value
    }));
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
          indirizzoTestuale: newSpotForm.indirizzoTestuale.trim()
        },
        tariffaOraria: tariffa,
        disponibilita: [],
        dichiarazioneProprietaAccettata: true
      });

      if (photoFiles.length > 0) {
        await api.uploadFoto(posto._id, photoFiles);
      }

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

  const nearbySpots = useMemo(() => {
    if (!searchCircle) {
      return spots;
    }

    return spots.filter((spot) => (
      spot.posizione &&
      Number.isFinite(Number(spot.posizione.latitudine)) &&
      Number.isFinite(Number(spot.posizione.longitudine)) &&
      distanceM(
        searchCircle.lat,
        searchCircle.lng,
        Number(spot.posizione.latitudine),
        Number(spot.posizione.longitudine)
      ) <= searchCircle.radiusM
    ));
  }, [spots, searchCircle]);

  return (
    <div className="app-page">
      <header className="hero-section">
        <div>
          <h1>ParkingShare Trento</h1>

          <p className="hero-subtitle">
            Trova e prenota posti auto privati a Trento in modo semplice e veloce.
          </p>
        </div>
      </header>

      <main className="main-layout">
        {!authenticatedUser && (
          <section className="landing-card">
            <div className="landing-content">
              <h2>Trova o condividi un posto auto, senza stress</h2>

              <p>
                Accedi alla piattaforma per cercare, prenotare o pubblicare
                un posto auto privato.
              </p>

              <ul className="landing-list">
                <li>Trova posti auto privati disponibili</li>
                <li>Prenota indicando l&apos;orario</li>
                <li>Pubblica il tuo posto auto in modo semplice</li>
              </ul>
            </div>

            {resetToken ? (
              <ResetPasswordPage
                token={resetToken}
                onSuccess={() => { window.location.href = '/?reset=success'; }}
              />
            ) : waitingVerification ? (
              <EmailVerificationPage email={pendingEmail} />
            ) : (
              <AuthPanel
                onAuthChange={handleAuthChange}
                verificationSuccess={verificationSuccess}
                resetSuccess={resetSuccess}
                onRegisterSuccess={(email) => {
                  setPendingEmail(email);
                  setWaitingVerification(true);
                }}
              />
            )}
          </section>
        )}

        {authenticatedUser && view === 'payment' && pendingBooking ? (
          <PaymentPage
            booking={pendingBooking}
            onDone={handlePaymentDone}
            onCancel={() => {
              setView('map');
              setPendingBooking(null);
            }}
          />
        ) : authenticatedUser && view === 'myBookings' ? (
          <>
            <AuthPanel onAuthChange={handleAuthChange} />

            <MyBookings
              onBack={() => setView('map')}
              onPay={handlePayFromBookings}
            />
          </>
        ) : authenticatedUser ? (
          <>
            <AuthPanel onAuthChange={handleAuthChange} />

            <section className="content-card dashboard-card">
              <div className="section-heading">
                <h2 style={{ margin: 0 }}>Posti auto disponibili</h2>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!isCreateSpotMode ? (
                    <button
                      className="secondary-button"
                      onClick={startCreateSpotMode}
                    >
                      Pubblica un posto
                    </button>
                  ) : (
                    <button
                      className="secondary-button"
                      onClick={cancelCreateSpotMode}
                    >
                      Annulla pubblicazione
                    </button>
                  )}

                  <button
                    className="secondary-button"
                    onClick={() => setView('myBookings')}
                  >
                    Le mie prenotazioni
                  </button>
                </div>
              </div>

              {!isCreateSpotMode && (
                <>
                  <div style={{ marginTop: '1rem' }}>
                    <SearchBar onSelect={handleSearchSelect} />
                  </div>

                  <p style={{ margin: '0.6rem 0 0', fontSize: 13, color: '#6b7280' }}>
                    {searchCircle
                      ? 'Clicca sulla mappa per spostare il punto di ricerca.'
                      : 'Cerca un luogo o clicca sulla mappa per trovare posti nelle vicinanze.'}
                  </p>
                </>
              )}

              {isCreateSpotMode && (
                <div className="create-spot-panel">
                  <div className="create-spot-instructions">
                    <h3>Pubblica il tuo posto auto</h3>

                    <p>
                      Clicca sulla mappa per selezionare il punto esatto del posto.
                      Puoi cliccare di nuovo sulla mappa per spostare il pin prima di pubblicare.
                    </p>

                    {createSpotPosition ? (
                      <p>
                        Posizione selezionata:{' '}
                        <strong>
                          {createSpotPosition.lat.toFixed(5)}, {createSpotPosition.lng.toFixed(5)}
                        </strong>
                      </p>
                    ) : (
                      <p>
                        Nessun punto selezionato. Seleziona il punto sulla mappa per continuare.
                      </p>
                    )}
                  </div>

                  {createSpotMessage && (
                    <p className="success-message">
                      {createSpotMessage}
                    </p>
                  )}

                  {createSpotError && (
                    <p className="error-message">
                      {createSpotError}
                    </p>
                  )}

                  {createSpotPosition && (
                    <form
                      className="create-spot-form"
                      onSubmit={handleCreatePrivateSpot}
                    >
                      <label>
                        Nome posto
                        <input
                          name="nome"
                          value={newSpotForm.nome}
                          onChange={handleNewSpotFormChange}
                          placeholder="Esempio: Posto coperto vicino al centro"
                          required
                        />
                      </label>

                      <label>
                        Indirizzo o riferimento
                        <input
                          name="indirizzoTestuale"
                          value={newSpotForm.indirizzoTestuale}
                          onChange={handleNewSpotFormChange}
                          placeholder="Puoi correggere o descrivere meglio l'indirizzo"
                        />
                      </label>

                      <label>
                        Tariffa oraria
                        <input
                          name="tariffaOraria"
                          type="number"
                          min="0"
                          step="0.5"
                          value={newSpotForm.tariffaOraria}
                          onChange={handleNewSpotFormChange}
                          placeholder="Esempio: 2.50"
                          required
                        />
                      </label>

                      <label>
                        Descrizione
                        <textarea
                          name="descrizione"
                          value={newSpotForm.descrizione}
                          onChange={handleNewSpotFormChange}
                          placeholder="Aggiungi dettagli utili per chi prenota"
                          rows={3}
                        />
                      </label>

                      <label>
                        Foto del posto (opzionale, max 10)
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={e => setPhotoFiles(Array.from(e.target.files))}
                          style={{ marginTop: 4 }}
                        />
                        {photoFiles.length > 0 && (
                          <span style={{ fontSize: 12, color: '#6b7280' }}>
                            {photoFiles.length} {photoFiles.length === 1 ? 'foto selezionata' : 'foto selezionate'}
                          </span>
                        )}
                      </label>

                      <label className="create-spot-checkbox">
                        <input
                          name="dichiarazioneProprietaAccettata"
                          type="checkbox"
                          checked={newSpotForm.dichiarazioneProprietaAccettata}
                          onChange={handleNewSpotFormChange}
                        />

                        <span>
                          Dichiaro di essere proprietario del posto auto o di avere
                          l&apos;autorizzazione a pubblicarlo
                        </span>
                      </label>

                      <button
                        className="primary-button"
                        type="submit"
                        disabled={createSpotLoading}
                      >
                        {createSpotLoading ? 'Pubblicazione...' : 'Pubblica posto'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </section>

            <div className={searchCircle ? 'map-area map-area--with-sidebar' : 'map-area'}>
              {searchCircle && !isCreateSpotMode && (
                <SpotSidebar
                  spots={nearbySpots}
                  radiusM={searchCircle.radiusM}
                  onRadiusChange={handleRadiusChange}
                  onClear={() => setSearchCircle(null)}
                  onSelectSpot={handleSelectSpot}
                />
              )}

              <section className="content-card map-section">
                {detailLoading && (
                  <p style={{ color: '#6b7280', marginBottom: 8 }}>
                    Caricamento posto...
                  </p>
                )}

                <SpotMap
                  spots={spots}
                  onSelectSpot={handleSelectSpot}
                  searchCircle={searchCircle}
                  onMapClick={handleMapClick}
                  flyTarget={flyTarget}
                  isCreateSpotMode={isCreateSpotMode}
                  createSpotPosition={createSpotPosition}
                />
              </section>
            </div>
          </>
        ) : null}
      </main>

      {spotDetail && (
        <div className="modal-overlay" onClick={() => setSpotDetail(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSpotDetail(null)}
            >
              ✕
            </button>

            <BookingCalendar
              posto={spotDetail.posto}
              prenotazioni={spotDetail.prenotazioni}
              recensioni={spotDetail.recensioni}
              mediaVoti={spotDetail.mediaVoti}
              onConfirm={handleBookingConfirm}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;