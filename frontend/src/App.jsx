import { useCallback, useMemo, useState, useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { api } from './services/api'
import AuthPanel from './components/AuthPanel'
import SearchBar from './components/SearchBar'
import SpotMap from './components/SpotMap'
import SpotSidebar from './components/SpotSidebar'
import BookingCalendar from './components/BookingCalendar'
import PaymentPage from './components/PaymentPage'
import MyBookings from './components/MyBookings'
import EmailVerificationPage from './components/VerificaMail'
import { getCurrentUser } from './services/authService'
import ResetPasswordPage from './components/ResetPassword';

function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState(null)
  const [view, setView] = useState('map')  // 'map' | 'myBookings' | 'payment'
  const [spots, setSpots] = useState([])
  const [spotDetail, setSpotDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pendingBooking, setPendingBooking] = useState(null)
  const [waitingVerification, setWaitingVerification] = useState(false)
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [searchCircle, setSearchCircle] = useState(null) // { lat, lng, radiusM }
  const [flyTarget, setFlyTarget] = useState(null)

  const path = window.location.pathname
  const resetToken = path.startsWith('/reset-password/') ? path.split('/reset-password/')[1] : null

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('verified') === 'true') {
      setVerificationSuccess(true)
      window.history.replaceState({}, document.title, '/')
    }
    if (params.get('reset') === 'success') {
      setResetSuccess(true)
    }
  }, [])

  const handleAuthChange = useCallback((user) => {
    setAuthenticatedUser(user)
    if (user) {
      api.listPosti().then(setSpots).catch(console.error)
    } else {
      setSpots([])
      setView('map')
      setSpotDetail(null)
      setPendingBooking(null)
      setSearchCircle(null)
      setFlyTarget(null)
    }
  }, [])

  async function handleSelectSpot(spotId) {
    setDetailLoading(true)
    setSpotDetail(null)
    try {
      const data = await api.getPostoConPrenotazioni(spotId)
      setSpotDetail(data)
    } catch (e) {
      alert(e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleBookingConfirm(params) {
    try {
      const booking = await api.createBooking({
        postoPrivatoId: spotDetail.posto._id,
        ...params,
      })
      booking.postoPrivatoId = spotDetail.posto
      setPendingBooking(booking)
      setSpotDetail(null)
      setView('payment')
    } catch (e) {
      alert(e.message)
    }
  }

  function handlePaymentDone() {
    setPendingBooking(null)
    setView('map')
    api.listPosti().then(setSpots).catch(console.error)
  }

  function handlePayFromBookings(booking) {
    setPendingBooking(booking)
    setView('payment')
  }

  function handleMapClick(latlng) {
    setSearchCircle(sc => ({ lat: latlng.lat, lng: latlng.lng, radiusM: sc?.radiusM ?? 500 }))
  }

  function handleSearchSelect({ lat, lng }) {
    const target = { lat, lng }
    setFlyTarget(target)
    setSearchCircle(sc => ({ lat, lng, radiusM: sc?.radiusM ?? 500 }))
  }

  function handleRadiusChange(radiusM) {
    setSearchCircle(sc => sc ? { ...sc, radiusM } : null)
  }

  const nearbySpots = useMemo(() => {
    if (!searchCircle) return spots
    return spots.filter(s =>
      distanceM(searchCircle.lat, searchCircle.lng, s.posizione.latitudine, s.posizione.longitudine) <= searchCircle.radiusM
    )
  }, [spots, searchCircle])

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
                onSuccess={() => { window.location.href = '/?reset=success' }}
              />
            ) : waitingVerification ? (
              <EmailVerificationPage email={pendingEmail} />
            ) : (
              <AuthPanel
                onAuthChange={handleAuthChange}
                verificationSuccess={verificationSuccess}
                resetSuccess={resetSuccess}
                onRegisterSuccess={(email) => {
                  setPendingEmail(email)
                  setWaitingVerification(true)
                }}
              />
            )}
          </section>
        )}

        {authenticatedUser && view === 'payment' && pendingBooking ? (
          <PaymentPage
            booking={pendingBooking}
            onDone={handlePaymentDone}
            onCancel={() => { setView('map'); setPendingBooking(null) }}
          />
        ) : authenticatedUser && view === 'myBookings' ? (
          <>
            <AuthPanel onAuthChange={handleAuthChange} />
            <MyBookings onBack={() => setView('map')} onPay={handlePayFromBookings} />
          </>
        ) : authenticatedUser ? (
          <>
            <AuthPanel onAuthChange={handleAuthChange} />

            <section className="content-card dashboard-card">
              <div className="section-heading">
                <h2 style={{ margin: 0 }}>Posti auto disponibili</h2>
                <button
                  className="secondary-button"
                  onClick={() => setView('myBookings')}
                >
                  Le mie prenotazioni
                </button>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <SearchBar onSelect={handleSearchSelect} />
              </div>
              <p style={{ margin: '0.6rem 0 0', fontSize: 13, color: '#6b7280' }}>
                {searchCircle
                  ? 'Clicca sulla mappa per spostare il punto di ricerca.'
                  : 'Cerca un luogo o clicca sulla mappa per trovare posti nelle vicinanze.'}
              </p>
            </section>

            <div className={searchCircle ? 'map-area map-area--with-sidebar' : 'map-area'}>
              {searchCircle && (
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
                  <p style={{ color: '#6b7280', marginBottom: 8 }}>Caricamento posto...</p>
                )}
                <SpotMap
                  spots={spots}
                  onSelectSpot={handleSelectSpot}
                  searchCircle={searchCircle}
                  onMapClick={handleMapClick}
                  flyTarget={flyTarget}
                />
              </section>
            </div>
          </>
        ) : null}
      </main>

      {spotDetail && (
        <div className="modal-overlay" onClick={() => setSpotDetail(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSpotDetail(null)}>✕</button>
            <BookingCalendar
              posto={spotDetail.posto}
              prenotazioni={spotDetail.prenotazioni}
              onConfirm={handleBookingConfirm}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
