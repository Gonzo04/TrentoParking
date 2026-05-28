import { useState } from 'react';
import './Dashboard.css';
import SearchBar from './SearchBar';
import SpotMap from './SpotMap';
import BookingCalendar from './BookingCalendar';

/* ══════════════════════════════════════════════════════════════════
   Costanti
══════════════════════════════════════════════════════════════════ */
const GIORNI = [
  { key: 'lunedi',    short: 'Lun', full: 'Lunedì'    },
  { key: 'martedi',   short: 'Mar', full: 'Martedì'   },
  { key: 'mercoledi', short: 'Mer', full: 'Mercoledì' },
  { key: 'giovedi',   short: 'Gio', full: 'Giovedì'   },
  { key: 'venerdi',   short: 'Ven', full: 'Venerdì'   },
  { key: 'sabato',    short: 'Sab', full: 'Sabato'    },
  { key: 'domenica',  short: 'Dom', full: 'Domenica'  },
];

export const TAGS = [
  { key: 'coperto',          emoji: '🏠', label: 'Coperto'          },
  { key: 'vicino_centro',    emoji: '📍', label: 'Vicino al centro' },
  { key: 'sorvegliato',      emoji: '🔒', label: 'Sorvegliato'      },
  { key: 'carica_elettrica', emoji: '⚡', label: 'Ricarica EV'      },
  { key: 'facile_accesso',   emoji: '✅', label: 'Facile accesso'   },
  { key: 'accessibile',      emoji: '♿', label: 'Accessibile'      },
];

const RADIUS_OPTIONS = [
  { value: 200,  label: '200 m' },
  { value: 500,  label: '500 m' },
  { value: 1000, label: '1 km'  },
  { value: 2000, label: '2 km'  },
];

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

function formatDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/* ══════════════════════════════════════════════════════════════════
   Disponibilità parcheggio
══════════════════════════════════════════════════════════════════ */
function AvailabilityEditor({ disponibilita, onChange }) {
  function toggleDay(giorno) {
    const exists = disponibilita.find(d => d.giorno === giorno);
    if (exists) {
      onChange(disponibilita.filter(d => d.giorno !== giorno));
    } else {
      // ordina per giorni
      const next = [...disponibilita, { giorno, oraInizio: '08:00', oraFine: '20:00' }];
      next.sort((a, b) =>
        GIORNI.findIndex(g => g.key === a.giorno) -
        GIORNI.findIndex(g => g.key === b.giorno)
      );
      onChange(next);
    }
  }

  function updateTime(giorno, field, value) {
    onChange(disponibilita.map(d => d.giorno === giorno ? { ...d, [field]: value } : d));
  }

  const activeDays = GIORNI.filter(g => disponibilita.some(d => d.giorno === g.key));

  return (
    <div className="db-avail-editor">
      {/* Riga bottoni giorno */}
      <div className="db-avail-days">
        {GIORNI.map(g => {
          const active = disponibilita.some(d => d.giorno === g.key);
          return (
            <button
              key={g.key}
              type="button"
              className={`db-day-btn${active ? ' db-day-btn--on' : ''}`}
              onClick={() => toggleDay(g.key)}
              title={g.full}
            >
              {g.short}
            </button>
          );
        })}
      </div>

      {/* Slot orario per ogni giorno attivo */}
      {activeDays.length > 0 && (
        <div className="db-avail-slots">
          {activeDays.map(g => {
            const slot = disponibilita.find(d => d.giorno === g.key);
            return (
              <div key={g.key} className="db-avail-row">
                <span className="db-avail-day-name">{g.full}</span>
                <div className="db-avail-times">
                  <input
                    type="time"
                    value={slot.oraInizio}
                    onChange={e => updateTime(g.key, 'oraInizio', e.target.value)}
                    className="db-time-input"
                  />
                  <span className="db-avail-arrow">→</span>
                  <input
                    type="time"
                    value={slot.oraFine}
                    onChange={e => updateTime(g.key, 'oraFine', e.target.value)}
                    className="db-time-input"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeDays.length === 0 && (
        <p className="db-avail-empty">
          Nessun giorno selezionato. Il posto risulterà disponibile su richiesta.
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Tag
══════════════════════════════════════════════════════════════════ */
function TagsEditor({ caratteristiche, onChange }) {
  function toggle(key) {
    if (caratteristiche.includes(key)) {
      onChange(caratteristiche.filter(c => c !== key));
    } else {
      onChange([...caratteristiche, key]);
    }
  }

  return (
    <div className="db-tags-grid">
      {TAGS.map(tag => {
        const active = caratteristiche.includes(tag.key);
        return (
          <button
            key={tag.key}
            type="button"
            className={`db-tag-toggle${active ? ' db-tag-toggle--on' : ''}`}
            onClick={() => toggle(tag.key)}
          >
            <span className="db-tag-emoji">{tag.emoji}</span>
            <span>{tag.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Card latterale a sinistra (singola)
══════════════════════════════════════════════════════════════════ */
function SpotCard({ spot, searchCircle, onSelect, isLoading, onHover, onHoverEnd }) {
  const spotId = spot.id || spot._id;

  let distText = null;
  if (
    searchCircle &&
    spot.posizione &&
    Number.isFinite(Number(spot.posizione.latitudine)) &&
    Number.isFinite(Number(spot.posizione.longitudine))
  ) {
    distText = formatDist(
      distanceM(
        searchCircle.lat, searchCircle.lng,
        Number(spot.posizione.latitudine),
        Number(spot.posizione.longitudine)
      )
    );
  }

  const visibleTags = (spot.caratteristiche ?? [])
    .map(key => TAGS.find(t => t.key === key))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div
      className="db-spot-card"
      onClick={() => onSelect(spotId)}
      onMouseEnter={() => onHover?.(spotId)}
      onMouseLeave={() => onHoverEnd?.()}
    >
      <div className="db-spot-card-top">
        <span className="db-spot-name">{spot.nome}</span>
        {distText && <span className="db-spot-dist">{distText}</span>}
      </div>

      {spot.posizione?.indirizzoTestuale && (
        <p className="db-spot-address">{spot.posizione.indirizzoTestuale}</p>
      )}

      {visibleTags.length > 0 && (
        <div className="db-spot-tags">
          {visibleTags.map(tag => (
            <span key={tag.key} className="db-spot-tag">
              {tag.emoji} {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="db-spot-card-footer">
        <span className="db-spot-price">
          €{Number(spot.tariffaOraria ?? 0).toFixed(2)}/h
        </span>
        <button
          className="db-spot-book-btn"
          onClick={(e) => { e.stopPropagation(); onSelect(spotId); }}
          disabled={isLoading}
        >
          Prenota
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Crazione posto parcheggio (form)
══════════════════════════════════════════════════════════════════ */
function CreateSpotPanel({
  createSpotPosition,
  createSpotLoading,
  createSpotMessage,
  createSpotError,
  newSpotForm,
  onFormChange,
  onSubmit,
  onCancel,
  onAddressSelect,
  onDisponibilitaChange,
  onCaratteristicheChange,
}) {
  return (
    <div className="db-create-panel">
      {/* Header */}
      <div className="db-create-header">
        <h3 className="db-create-title">Pubblica il tuo posto</h3>
        <button className="db-create-cancel" type="button" onClick={onCancel}>
          ✕ Annulla
        </button>
      </div>

      {/* Ricerca indirizzo */}
      <div className="db-create-section">
        <p className="db-create-section-label">Posizione</p>
        <SearchBar onSelect={onAddressSelect} />
        <p className="db-create-or">oppure clicca direttamente sulla mappa</p>
      </div>

      {/* Stato posizione */}
      <div className={`db-create-hint${createSpotPosition ? ' db-create-hint--set' : ''}`}>
        {createSpotPosition ? (
          <>
            <span className="db-create-hint-icon">📍</span>
            <span>
              Posizione impostata
              <small>
                {createSpotPosition.lat.toFixed(5)}, {createSpotPosition.lng.toFixed(5)}
                {' '}&mdash; clicca di nuovo sulla mappa per spostarla
              </small>
            </span>
          </>
        ) : (
          <>
            <span className="db-create-hint-icon">🗺️</span>
            <span>Nessuna posizione selezionata</span>
          </>
        )}
      </div>

      {createSpotMessage && <p className="db-msg db-msg--success">{createSpotMessage}</p>}
      {createSpotError   && <p className="db-msg db-msg--error">{createSpotError}</p>}

      {/* Form — visibile solo dopo aver selezionato la posizione */}
      {createSpotPosition && (
        <form className="db-create-form" onSubmit={onSubmit}>

          {/* ── Dati base ─────────────────────────────────────── */}
          <div className="db-create-section">
            <p className="db-create-section-label">Dati del posto</p>

            <label className="db-label">
              Nome posto
              <input
                className="db-input"
                name="nome"
                value={newSpotForm.nome}
                onChange={onFormChange}
                placeholder="Es. Posto coperto vicino al Duomo"
                required
              />
            </label>

            <label className="db-label">
              Indirizzo
              <input
                className="db-input"
                name="indirizzoTestuale"
                value={newSpotForm.indirizzoTestuale}
                onChange={onFormChange}
                placeholder="Compilato automaticamente, puoi modificarlo"
              />
            </label>

            <label className="db-label">
              Tariffa oraria (€)
              <input
                className="db-input"
                name="tariffaOraria"
                type="number"
                min="0"
                step="0.5"
                value={newSpotForm.tariffaOraria}
                onChange={onFormChange}
                placeholder="Es. 2.50"
                required
              />
            </label>

            <label className="db-label">
              Descrizione <span className="db-label-optional">(facoltativa)</span>
              <textarea
                className="db-input db-textarea"
                name="descrizione"
                value={newSpotForm.descrizione}
                onChange={onFormChange}
                placeholder="Aggiungi dettagli utili per chi prenota"
                rows={3}
              />
            </label>
          </div>

          {/* ── Caratteristiche ───────────────────────────────── */}
          <div className="db-create-section">
            <p className="db-create-section-label">Caratteristiche</p>
            <p className="db-create-section-hint">
              Seleziona i tag che descrivono meglio il tuo posto — saranno mostrati agli utenti.
            </p>
            <TagsEditor
              caratteristiche={newSpotForm.caratteristiche}
              onChange={onCaratteristicheChange}
            />
          </div>

          {/* ── Disponibilità ─────────────────────────────────── */}
          <div className="db-create-section">
            <p className="db-create-section-label">Disponibilità settimanale</p>
            <p className="db-create-section-hint">
              Indica i giorni e gli orari in cui il posto è prenotabile.
            </p>
            <AvailabilityEditor
              disponibilita={newSpotForm.disponibilita}
              onChange={onDisponibilitaChange}
            />
          </div>

          {/* ── Dichiarazione ─────────────────────────────────── */}
          <label className="db-label-checkbox">
            <input
              type="checkbox"
              name="dichiarazioneProprietaAccettata"
              checked={newSpotForm.dichiarazioneProprietaAccettata}
              onChange={onFormChange}
            />
            <span>
              Dichiaro di essere proprietario del posto o di avere l&apos;autorizzazione a pubblicarlo
            </span>
          </label>

          <button
            className="db-publish-submit"
            type="submit"
            disabled={createSpotLoading}
          >
            {createSpotLoading ? 'Pubblicazione…' : 'Pubblica posto'}
          </button>
        </form>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Dashboard
══════════════════════════════════════════════════════════════════ */
function Dashboard({
  authenticatedUser,
  spots,
  nearbySpots,
  searchCircle,
  flyTarget,
  detailLoading,
  isCreateSpotMode,
  createSpotPosition,
  createSpotLoading,
  createSpotMessage,
  createSpotError,
  newSpotForm,
  spotDetail,
  onLogout,
  onMyBookings,
  onProfileClick,
  onSearchSelect,
  onRadiusChange,
  onClearSearch,
  onSelectSpot,
  onMapClick,
  onStartCreateSpot,
  onCancelCreateSpot,
  onNewSpotFormChange,
  onCreateSpot,
  onCreateSpotAddressSelect,
  onDisponibilitaChange,
  onCaratteristicheChange,
  onCloseDetail,
  onBookingConfirm,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredSpotId, setHoveredSpotId] = useState(null);

  const baseSpots = searchCircle ? nearbySpots : spots;

  const filteredSpots = baseSpots.filter((spot) => {
    if (activeFilter !== 'all')
      return spot.caratteristiche?.includes(activeFilter);
    return true;
  });

  const spotsLabel = searchCircle
    ? `${filteredSpots.length} ${filteredSpots.length === 1 ? 'posto' : 'posti'} nel raggio`
    : `${filteredSpots.length} ${filteredSpots.length === 1 ? 'posto' : 'posti'} disponibili`;

  return (
    <div className="db-root">

      {/* ══ NAVBAR ═══════════════════════════════════════════════════ */}
      <nav className="db-nav">
        <div className="db-nav-logo">
          <span className="db-logo-trento">Trento</span>
          <span className="db-logo-parking">Parking</span>
        </div>

        <div className="db-nav-actions">
          {authenticatedUser && (
            <button className="db-nav-username" onClick={onProfileClick} title="Gestisci il tuo profilo">
              {authenticatedUser.nomeUtente}
            </button>
          )}
          <button className="db-nav-btn" onClick={onMyBookings}>
            Le mie prenotazioni
          </button>
          <button className="db-nav-btn db-nav-btn--danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* ══ LAYOUT ═══════════════════════════════════════════════════ */}
      <div className="db-layout">

        {/* ── SIDEBAR ──────────────────────────────────────────────── */}
        <aside className="db-sidebar">
          <div className="db-sidebar-scroll">

            {isCreateSpotMode ? (
              <CreateSpotPanel
                createSpotPosition={createSpotPosition}
                createSpotLoading={createSpotLoading}
                createSpotMessage={createSpotMessage}
                createSpotError={createSpotError}
                newSpotForm={newSpotForm}
                onFormChange={onNewSpotFormChange}
                onSubmit={onCreateSpot}
                onCancel={onCancelCreateSpot}
                onAddressSelect={onCreateSpotAddressSelect}
                onDisponibilitaChange={onDisponibilitaChange}
                onCaratteristicheChange={onCaratteristicheChange}
              />
            ) : (
              <>
                {/* Ricerca */}
                <div className="db-section">
                  <SearchBar onSelect={onSearchSelect} />
                  <p className="db-hint">
                    {searchCircle
                      ? 'Clicca sulla mappa per spostare il punto di ricerca.'
                      : 'Cerca un indirizzo o clicca sulla mappa per trovare posti nelle vicinanze.'}
                  </p>
                </div>

                {/* Raggio — solo quando c'è un cerchio di ricerca */}
                {searchCircle && (
                  <div className="db-section db-section--radius">
                    <div className="db-section-header">
                      <span className="db-section-label">Raggio di ricerca</span>
                      <button className="db-clear-btn" onClick={onClearSearch}>
                        Cancella
                      </button>
                    </div>
                    <div className="db-chips-row">
                      {RADIUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          className={`db-chip${searchCircle.radiusM === opt.value ? ' db-chip--active' : ''}`}
                          onClick={() => onRadiusChange(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filtri rapidi */}
                <div className="db-section db-section--filters">
                  <div className="db-chips-row">
                    <button
                      className={`db-chip${activeFilter === 'all' ? ' db-chip--active' : ''}`}
                      onClick={() => setActiveFilter('all')}
                    >
                      Tutti
                    </button>
                    {TAGS.map(tag => (
                      <button
                        key={tag.key}
                        className={`db-chip${activeFilter === tag.key ? ' db-chip--active' : ''}`}
                        onClick={() => setActiveFilter(tag.key)}
                      >
                        {tag.emoji} {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista posti */}
                <div className="db-section db-section--list">
                  <div className="db-section-header">
                    <span className="db-section-label">{spotsLabel}</span>
                    {detailLoading && <span className="db-loading-badge">Caricamento…</span>}
                  </div>

                  {filteredSpots.length === 0 ? (
                    <p className="db-empty">
                      {activeFilter !== 'all'
                        ? 'Nessun posto corrisponde al filtro selezionato.'
                        : searchCircle
                          ? 'Nessun posto in quest\'area. Prova ad aumentare il raggio.'
                          : 'Nessun posto disponibile al momento.'}
                    </p>
                  ) : (
                    <div className="db-spot-list">
                      {filteredSpots.map((spot) => (
                        <SpotCard
                          key={spot.id || spot._id}
                          spot={spot}
                          searchCircle={searchCircle}
                          onSelect={onSelectSpot}
                          isLoading={detailLoading}
                          onHover={setHoveredSpotId}
                          onHoverEnd={() => setHoveredSpotId(null)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer fisso — pubblica posto */}
          {!isCreateSpotMode && (
            <div className="db-sidebar-footer">
              <button className="db-publish-btn" onClick={onStartCreateSpot}>
                + Pubblica il tuo posto
              </button>
            </div>
          )}
        </aside>

        {/* ── MAPPA ────────────────────────────────────────────────── */}
        <main className="db-map-area">
          <SpotMap
            spots={spots}
            onSelectSpot={onSelectSpot}
            searchCircle={searchCircle}
            onMapClick={onMapClick}
            flyTarget={flyTarget}
            isCreateSpotMode={isCreateSpotMode}
            createSpotPosition={createSpotPosition}
            hoveredSpotId={hoveredSpotId}
          />
        </main>
      </div>

      {/* ══ MODAL PRENOTAZIONE ══════════════════════════════════════ */}
      {spotDetail && (
        <div className="db-modal-overlay" onClick={onCloseDetail}>
          <div className="db-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="db-modal-close" onClick={onCloseDetail}>✕</button>
            <BookingCalendar
              posto={spotDetail.posto}
              prenotazioni={spotDetail.prenotazioni}
              onConfirm={onBookingConfirm}
              isOwner={
                !!authenticatedUser &&
                String(spotDetail.posto.hostId?._id ?? spotDetail.posto.hostId) === String(authenticatedUser.id)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
