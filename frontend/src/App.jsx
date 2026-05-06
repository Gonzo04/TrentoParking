import { useCallback, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { api } from './services/api'
import AuthPanel from './components/AuthPanel'
import SpotMap from './components/SpotMap'
import SpotSidebar from './components/SpotSidebar'
import BookingCalendar from './components/BookingCalendar'
import PaymentPage from './components/PaymentPage'
import MyBookings from './components/MyBookings'

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
  const [searchCircle, setSearchCircle] = useState(null) // { lat, lng, radiusM }

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

            <AuthPanel onAuthChange={handleAuthChange} />
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
                <div>
                  <h2>Posti auto disponibili</h2>

                  <p>
                    {searchCircle
                      ? 'Clicca sulla mappa per spostare il punto di ricerca.'
                      : 'Clicca sulla mappa per cercare posti in un\'area.'}
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => setView('myBookings')}
                >
                  Le mie prenotazioni
                </button>
              </div>
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
