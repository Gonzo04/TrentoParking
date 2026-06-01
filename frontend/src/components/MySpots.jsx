import { useEffect, useState } from 'react';
import { api } from '../services/api';

const GIORNI_DISPONIBILITA = [
  { value: 'LUNEDI', label: 'Lunedì' },
  { value: 'MARTEDI', label: 'Martedì' },
  { value: 'MERCOLEDI', label: 'Mercoledì' },
  { value: 'GIOVEDI', label: 'Giovedì' },
  { value: 'VENERDI', label: 'Venerdì' },
  { value: 'SABATO', label: 'Sabato' },
  { value: 'DOMENICA', label: 'Domenica' }
];

function getSpotId(spot) {
  return spot._id || spot.id;
}

function getInitialAvailabilityForm(spot) {
  const disponibilita = Array.isArray(spot.disponibilita)
    ? spot.disponibilita
    : [];

  const giorni = disponibilita.map((fascia) => fascia.giorno);

  const primaFascia = disponibilita[0];

  return {
    giorni,
    oraInizio: String(primaFascia?.oraInizio ?? 8),
    oraFine: String(primaFascia?.oraFine ?? 18)
  };
}

function formatDisponibilita(disponibilita) {
  if (!Array.isArray(disponibilita) || disponibilita.length === 0) {
    return 'Nessuna disponibilità impostata';
  }

  return disponibilita
    .map((fascia) => `${fascia.giorno} ${fascia.oraInizio}:00-${fascia.oraFine}:00`)
    .join(', ');
}

function MySpots({ onBack, onChanged }) {
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadMySpots() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await api.listMySpots();
      setSpots(data);
    } catch (err) {
      setError(err.message || 'Errore durante il caricamento dei posti');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMySpots();
  }, []);

  function openEditor(spot) {
    const disponibilitaForm = getInitialAvailabilityForm(spot);

    setSelectedSpot(spot);
    setMessage('');
    setError('');

    setForm({
      nome: spot.nome || '',
      descrizione: spot.descrizione || '',
      tariffaOraria: String(spot.tariffaOraria ?? ''),
      attivo: spot.attivo === true,
      disponibilitaGiorni: disponibilitaForm.giorni,
      disponibilitaOraInizio: disponibilitaForm.oraInizio,
      disponibilitaOraFine: disponibilitaForm.oraFine
    });
  }

  function closeEditor() {
    setSelectedSpot(null);
    setForm(null);
    setMessage('');
    setError('');
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;

    if (name === 'disponibilitaGiorni') {
      setForm((currentForm) => {
        const giorniAttuali = currentForm.disponibilitaGiorni;

        const nuoviGiorni = checked
          ? [...giorniAttuali, value]
          : giorniAttuali.filter((giorno) => giorno !== value);

        return {
          ...currentForm,
          disponibilitaGiorni: nuoviGiorni
        };
      });

      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!selectedSpot || !form) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const tariffa = Number(form.tariffaOraria);
    const oraInizio = Number(form.disponibilitaOraInizio);
    const oraFine = Number(form.disponibilitaOraFine);

    if (!form.nome.trim()) {
      setError('Il nome del posto è obbligatorio');
      setSaving(false);
      return;
    }

    if (!Number.isFinite(tariffa) || tariffa < 0) {
      setError('La tariffa oraria non è valida');
      setSaving(false);
      return;
    }

    if (form.disponibilitaGiorni.length === 0) {
      setError('Seleziona almeno un giorno di disponibilità');
      setSaving(false);
      return;
    }

    if (!Number.isInteger(oraInizio) || !Number.isInteger(oraFine)) {
      setError('Gli orari devono essere numeri interi');
      setSaving(false);
      return;
    }

    if (oraInizio < 0 || oraInizio > 23 || oraFine < 1 || oraFine > 24) {
      setError('Gli orari devono essere compresi tra 0 e 24');
      setSaving(false);
      return;
    }

    if (oraFine <= oraInizio) {
      setError('L ora di fine deve essere successiva all ora di inizio');
      setSaving(false);
      return;
    }

    const disponibilita = form.disponibilitaGiorni.map((giorno) => ({
      giorno,
      oraInizio,
      oraFine
    }));

    try {
      const updatedSpot = await api.updatePostoPrivato(getSpotId(selectedSpot), {
        nome: form.nome.trim(),
        descrizione: form.descrizione.trim(),
        tariffaOraria: tariffa,
        disponibilita,
        attivo: form.attivo
      });

      setSpots((currentSpots) => (
        currentSpots.map((spot) => (
          getSpotId(spot) === getSpotId(updatedSpot)
            ? updatedSpot
            : spot
        ))
      ));

      setSelectedSpot(updatedSpot);
      setMessage('Posto aggiornato correttamente');

      if (onChanged) {
        onChanged();
      }
    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio del posto');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedSpot) {
      return;
    }

    const confirmed = window.confirm(
      'Vuoi eliminare questo posto? Non sarà più visibile o prenotabile'
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.eliminaPostoPrivato(getSpotId(selectedSpot));

      setSpots((currentSpots) => (
        currentSpots.filter((spot) => getSpotId(spot) !== getSpotId(selectedSpot))
      ));

      closeEditor();

      if (onChanged) {
        onChanged();
      }
    } catch (err) {
      setError(err.message || 'Errore durante l eliminazione del posto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-card dashboard-card">
      <div className="section-heading">
        <div>
          <h2 style={{ margin: 0 }}>I miei posti privati</h2>

          <p style={{ margin: '0.4rem 0 0', color: '#6b7280' }}>
            Gestisci i posti che hai pubblicato sulla piattaforma.
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
        <p style={{ color: '#6b7280' }}>
          Caricamento dei tuoi posti...
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {message && (
        <p className="success-message">
          {message}
        </p>
      )}

      {!loading && spots.length === 0 && (
        <p style={{ color: '#6b7280' }}>
          Non hai ancora pubblicato posti privati.
        </p>
      )}

      {!loading && spots.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {spots.map((spot) => (
            <article
              key={getSpotId(spot)}
              className="content-card"
              style={{ padding: '1rem' }}
            >
              <div className="section-heading">
                <div>
                  <h3 style={{ margin: 0 }}>{spot.nome}</h3>

                  <p style={{ margin: '0.3rem 0', color: '#6b7280' }}>
                    {spot.posizione?.indirizzoTestuale || 'Indirizzo non specificato'}
                  </p>

                  <p style={{ margin: '0.3rem 0' }}>
                    <strong>Tariffa:</strong> €{Number(spot.tariffaOraria).toFixed(2)}/ora
                  </p>

                  <p style={{ margin: '0.3rem 0' }}>
                    <strong>Stato:</strong> {spot.attivo ? 'Attivo' : 'Non attivo'}
                  </p>

                  <p style={{ margin: '0.3rem 0', color: '#6b7280' }}>
                    {formatDisponibilita(spot.disponibilita)}
                  </p>
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => openEditor(spot)}
                >
                  Gestisci
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedSpot && form && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              type="button"
              onClick={closeEditor}
            >
              ✕
            </button>

            <h3>Gestisci posto</h3>

            <form className="create-spot-form" onSubmit={handleSave}>
              <label>
                Nome posto
                <input
                  name="nome"
                  value={form.nome}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Descrizione
                <textarea
                  name="descrizione"
                  value={form.descrizione}
                  onChange={handleFormChange}
                  rows={3}
                />
              </label>

              <label>
                Tariffa oraria
                <input
                  name="tariffaOraria"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.tariffaOraria}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <div className="availability-fields">
                <p className="form-section-title">
                  Disponibilità del posto
                </p>

                <div className="availability-days">
                  {GIORNI_DISPONIBILITA.map((giorno) => (
                    <label
                      key={giorno.value}
                      className="create-spot-checkbox"
                    >
                      <input
                        name="disponibilitaGiorni"
                        type="checkbox"
                        value={giorno.value}
                        checked={form.disponibilitaGiorni.includes(giorno.value)}
                        onChange={handleFormChange}
                      />

                      <span>{giorno.label}</span>
                    </label>
                  ))}
                </div>

                <div className="availability-hours">
                  <label>
                    Ora inizio
                    <input
                      name="disponibilitaOraInizio"
                      type="number"
                      min="0"
                      max="23"
                      step="1"
                      value={form.disponibilitaOraInizio}
                      onChange={handleFormChange}
                      required
                    />
                  </label>

                  <label>
                    Ora fine
                    <input
                      name="disponibilitaOraFine"
                      type="number"
                      min="1"
                      max="24"
                      step="1"
                      value={form.disponibilitaOraFine}
                      onChange={handleFormChange}
                      required
                    />
                  </label>
                </div>
              </div>

              <label className="create-spot-checkbox">
                <input
                  name="attivo"
                  type="checkbox"
                  checked={form.attivo}
                  onChange={handleFormChange}
                />

                <span>
                  Posto attivo e prenotabile
                </span>
              </label>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Salvataggio...' : 'Salva modifiche'}
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Elimina posto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default MySpots;