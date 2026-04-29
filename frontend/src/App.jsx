import { useCallback, useState } from 'react';
import './App.css';
import MapPicker from './components/MapPicker';
import AuthPanel from './components/AuthPanel';

function App() {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  // Questa funzione riceve la posizione scelta sulla mappa.
  // Prima di salvarla nello stato controlliamo che latitudine e longitudine siano numeri validi.
  // Questo evita errori runtime di Leaflet se arrivano dati incompleti o nel formato sbagliato.
  function handlePositionSelected(position) {
    const lat = position?.lat;
    const lng = position?.lng;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn('Posizione non valida ricevuta dalla mappa:', position);
      return;
    }

    setSelectedPosition({ lat, lng });
  }

  // AuthPanel chiama questa funzione dopo login, registrazione, logout
  // oppure dopo il recupero dell'utente da token salvato nel localStorage.
  const handleAuthChange = useCallback((user) => {
    setAuthenticatedUser(user);
  }, []);

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

        {authenticatedUser && (
          <>
            <AuthPanel onAuthChange={handleAuthChange} />

            <section className="content-card dashboard-card">
              <h2>Posti auto privati</h2>

              <p>
                Cerca sulla mappa i posti auto privati disponibili a Trento
                oppure seleziona una posizione per pubblicare un nuovo posto.
              </p>
            </section>

            <section className="content-card map-section">
              <div className="section-heading">
                <div>
                  <h2>Mappa</h2>

                  <p>
                    La mappa mostra i posti auto privati presenti sulla piattaforma.
                  </p>
                </div>
              </div>

              <MapPicker
                selectedPosition={selectedPosition}
                radiusMeters={300}
                onSelectPosition={handlePositionSelected}
              />

              {selectedPosition && (
                <div className="selected-position-box">
                  <h3>Posizione selezionata</h3>

                  <p>
                    <strong>Latitudine:</strong> {selectedPosition.lat.toFixed(6)}
                  </p>

                  <p>
                    <strong>Longitudine:</strong> {selectedPosition.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;