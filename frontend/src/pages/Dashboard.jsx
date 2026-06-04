import { useState } from 'react'
import './Dashboard.css'
import SearchBar from '../components/common/SearchBar'
import SpotMap from '../features/spots/SpotMap'
import BookingCalendar from '../features/bookings/BookingCalendar'
import { AvailabilityEditor, TagsEditor } from '../features/spots/SpotFormControls'
import { TAGS } from '../utils/SpotOptions'

const RADIUS_OPTIONS = [
  { value: 200, label: '200 m' },
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
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
   Card laterale a sinistra
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
        searchCircle.lat,
        searchCircle.lng,
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

      {spot.mediaStelle != null && (
        <div className="db-spot-rating">
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ color: i <= Math.round(spot.mediaStelle) ? '#f59e0b' : '#e2e8f0', fontSize: 13 }}>★</span>
          ))}
          <span className="db-spot-rating-text">{spot.mediaStelle} ({spot.totaleRecensioni})</span>
        </div>
      )}

      <div className="db-spot-card-footer">
        <span className="db-spot-price">
          €{Number(spot.tariffaOraria ?? 0).toFixed(2)}/h
        </span>

        <button
          className="db-spot-book-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(spotId);
          }}
          disabled={isLoading}
        >
          Prenota
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Creazione posto parcheggio
══════════════════════════════════════════════════════════════════ */
function CreateSpotPanel({
  createSpotPosition,
  createSpotLoading,
  createSpotMessage,
  createSpotError,
  newSpotForm,
  photoFiles,
  onFormChange,
  onSubmit,
  onCancel,
  onAddressSelect,
  onDisponibilitaChange,
  onCaratteristicheChange,
  onPhotoFilesChange,
}) {
  return (
    <div className="db-create-panel">
      <div className="db-create-header">
        <h3 className="db-create-title">Pubblica il tuo posto</h3>

        <button className="db-create-cancel" type="button" onClick={onCancel}>
          ✕ Annulla
        </button>
      </div>

      <div className="db-create-section">
        <p className="db-create-section-label">Posizione</p>
        <SearchBar onSelect={onAddressSelect} />
        <p className="db-create-or">oppure clicca direttamente sulla mappa</p>
      </div>

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
      {createSpotError && <p className="db-msg db-msg--error">{createSpotError}</p>}

      {createSpotPosition && (
        <form className="db-create-form" onSubmit={onSubmit}>
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

          <div className="db-create-section">
            <p className="db-create-section-label">Caratteristiche</p>
            <p className="db-create-section-hint">
              Seleziona i tag che descrivono meglio il tuo posto: saranno mostrati agli utenti.
            </p>

            <TagsEditor
              caratteristiche={newSpotForm.caratteristiche}
              onChange={onCaratteristicheChange}
            />
          </div>

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

          <label className="db-label">
            Foto del posto <span className="db-label-optional">(facoltative, max 10)</span>
            <input
              className="db-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={e => onPhotoFilesChange(Array.from(e.target.files))}
              style={{ marginTop: 4 }}
            />
            {photoFiles && photoFiles.length > 0 && (
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                {photoFiles.length} {photoFiles.length === 1 ? 'foto selezionata' : 'foto selezionate'}
              </span>
            )}
          </label>

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
  photoFiles,
  onPhotoFilesChange,
  onLogout,
  onMyBookings,
  onReceivedBookings,
  onProfileClick,
  onAdminClick,
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
  onViewPostoReviews,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredSpotId, setHoveredSpotId] = useState(null);

  const baseSpots = searchCircle ? nearbySpots : spots;

  const filteredSpots = baseSpots.filter((spot) => {
    if (activeFilter !== 'all') {
      return spot.caratteristiche?.includes(activeFilter);
    }

    return true;
  });

  const spotsLabel = searchCircle
    ? `${filteredSpots.length} ${filteredSpots.length === 1 ? 'posto' : 'posti'} nel raggio`
    : `${filteredSpots.length} ${filteredSpots.length === 1 ? 'posto' : 'posti'} disponibili`;

  return (
    <div className="db-root">
      <nav className="db-nav">
        <div className="db-nav-logo">
          <span className="db-logo-trento">Trento</span>
          <span className="db-logo-parking">Parking</span>
        </div>

        <div className="db-nav-actions">
          {authenticatedUser && (
            <button
              className="db-nav-username"
              onClick={onProfileClick}
              title="Gestisci il tuo profilo"
            >
              {authenticatedUser.nomeUtente}
            </button>
          )}

          <button className="db-nav-btn" onClick={onMyBookings}>
            Le mie prenotazioni
          </button>

          {authenticatedUser?.ruolo === 'HOST' && (
            <button className="db-nav-btn" onClick={onReceivedBookings}>
              Prenotazioni ricevute
            </button>
          )}

          {authenticatedUser?.ruolo === 'AMMINISTRATORE' && (
            <button className="db-nav-btn db-nav-btn--admin" onClick={onAdminClick}>
              Pannello Admin
            </button>
          )}

          <button className="db-nav-btn db-nav-btn--danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="db-layout">
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
                photoFiles={photoFiles}
                onPhotoFilesChange={onPhotoFilesChange}
              />
            ) : (
              <>
                <div className="db-section">
                  <SearchBar onSelect={onSearchSelect} />
                  <p className="db-hint">
                    {searchCircle
                      ? 'Clicca sulla mappa per spostare il punto di ricerca.'
                      : 'Cerca un indirizzo o clicca sulla mappa per trovare posti nelle vicinanze.'}
                  </p>
                </div>

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

          {!isCreateSpotMode && (
            <div className="db-sidebar-footer">
              <button className="db-publish-btn" onClick={onStartCreateSpot}>
                + Pubblica il tuo posto
              </button>
            </div>
          )}
        </aside>

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
              onViewSpotReviews={onViewPostoReviews}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;