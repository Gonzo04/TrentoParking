import { useEffect, useState } from 'react';
import { api } from '../services/api';

const STATO_LABEL = {
  IN_ATTESA_PAGAMENTO: { label: 'In attesa di pagamento', color: '#d97706' },
  PAGATA: { label: 'Confermata', color: '#16a34a' },
  ANNULLATA: { label: 'Annullata', color: '#dc2626' },
};

function getUserName(user) {
  // Se il backend non ha popolato l'utente, mostriamo un testo sicuro
  if (!user || typeof user === 'string') {
    return 'Utente non disponibile';
  }

  // Costruiamo il nome completo solo con i campi realmente presenti
  const nomeCompleto = [user.nome, user.cognome]
    .filter(Boolean)
    .join(' ');

  // Se nome e cognome non esistono, usiamo il nome utente come fallback
  return nomeCompleto || user.nomeUtente || 'Utente non disponibile';
}

function getUserContact(user) {
  // Il contatto viene mostrato solo perché esiste una prenotazione reale
  if (!user || typeof user === 'string') {
    return '';
  }

  return user.email || user.nomeUtente || '';
}

function formatDateTimeRange(booking) {
  // Centralizziamo la formattazione della data per non ripeterla nel JSX
  const inizio = new Date(booking.dataOraInizio);
  const fine = new Date(booking.dataOraFine);

  return `${inizio.toLocaleString('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })} → ${fine.toLocaleString('it-IT', {
    timeStyle: 'short'
  })}`;
}

export default function MyReceivedBookings({ onBack }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Carichiamo le prenotazioni ricevute sui posti pubblicati dall'host loggato
    api.listReceivedBookings()
      .then(setBookings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="content-card dashboard-card">
      <div className="section-heading">
        <div>
          <h2 style={{ margin: 0 }}>Prenotazioni ricevute</h2>

          <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: 15 }}>
            Qui trovi le prenotazioni effettuate dagli utenti sui posti che hai pubblicato.
          </p>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={onBack}
        >
          Torna alla mappa
        </button>
      </div>

      {loading && (
        <p style={{ color: '#6b7280', fontSize: 15 }}>
          Caricamento delle prenotazioni ricevute...
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: 12,
            background: '#f8fafc',
            border: '1px solid #e5e7eb'
          }}
        >
          <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
            Non hai ancora ricevuto prenotazioni sui tuoi posti.
          </p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {bookings.map((booking) => {
            const spot = booking.postoPrivatoId;
            const driver = booking.utenteId;
            const stato = STATO_LABEL[booking.stato] ?? {
              label: booking.stato,
              color: '#374151'
            };

            const driverName = getUserName(driver);
            const driverContact = getUserContact(driver);

            return (
              <article
                key={booking._id}
                className="content-card"
                style={{ padding: '1rem' }}
              >
                <div className="section-heading">
                  <div>
                    <h3 style={{ margin: 0 }}>
                      {spot?.nome || 'Posto non disponibile'}
                    </h3>

                    <p style={{ margin: '0.35rem 0', color: '#6b7280', fontSize: 14 }}>
                      {spot?.posizione?.indirizzoTestuale || 'Indirizzo non disponibile'}
                    </p>

                    <p style={{ margin: '0.35rem 0', color: '#374151', fontSize: 14 }}>
                      <strong>Periodo:</strong> {formatDateTimeRange(booking)}
                    </p>

                    <div
                      style={{
                        marginTop: '0.8rem',
                        padding: '0.8rem',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <p style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: 14 }}>
                        Utente che ha prenotato
                      </p>

                      <p style={{ margin: '0 0 0.35rem', color: '#374151', fontSize: 14 }}>
                        {driverName}
                      </p>

                      <p style={{ margin: '0 0 0.35rem', color: '#6b7280', fontSize: 14 }}>
                        {driverContact || 'Contatto non disponibile'}
                      </p>

                      <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                        <strong>Targa:</strong> {booking.targa || driver?.targa || 'Non disponibile'}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 0.4rem', fontWeight: 700, fontSize: 17, color: '#2563eb' }}>
                      €{Number(booking.prezzoTotale || 0).toFixed(2)}
                    </p>

                    <span style={{ fontSize: 13, fontWeight: 700, color: stato.color }}>
                      {stato.label}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}