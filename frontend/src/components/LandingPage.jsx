import { useState, useEffect, useRef } from 'react';
import './LandingPage.css';


/* ── Mappa Leaflet read-only ─────────────────────────────────────── */
function HeroMap({ height = 120 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Leaflet è già installato nel progetto (usato da SpotMap)
    const L = window.L || require('leaflet');

    const map = L.map(containerRef.current, {
      center: [46.0679, 11.1211], // Trento centro
      zoom: 14,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Marker personalizzato teal sul centro di Trento
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;
        background:#2a9d8f;
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 2px 8px rgba(42,157,143,0.6);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    L.marker([46.0679, 11.1211], { icon }).addTo(map);

    return () => map.remove();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }}
    />
  );
}


const STEPS = [
  {
    title: 'Cerca un posto vicino a te',
    desc: 'Usa la mappa interattiva o inserisci un indirizzo: vedi subito i posti privati disponibili nella tua zona.',
    visual: (
      <div className="lp-visual-card">
        <div className="lp-vc-address">
          <span className="lp-vc-address-icon">📍</span>
          Via Manci, Trento Centro
        </div>
        <div style={{ marginBottom: 12 }}>
          <HeroMap />
        </div>
        <div className="lp-vc-map-tags">
          {['Coperto', 'Disponibile ora', '€2/h'].map(t => (
            <span key={t} className="lp-vc-tag">{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Prenota con orario e data',
    desc: 'Seleziona il giorno e la fascia oraria nel calendario. Ricevi conferma immediata con i dettagli del posto.',
    visual: (
      <div className="lp-visual-card">
        <div className="lp-vc-label">Seleziona orario</div>
        <div className="lp-vc-time-grid">
          {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'].map((t, i) => (
            <div key={t} className={`lp-vc-time-slot ${i === 1 ? 'lp-vc-time-slot--active' : 'lp-vc-time-slot--inactive'}`}>{t}</div>
          ))}
        </div>
        <div className="lp-vc-summary">
          <span className="lp-vc-summary-time">09:00 — 11:00</span>
          <span className="lp-vc-summary-price">€4,00</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Paga in modo sicuro',
    desc: 'Pagamento integrato nella piattaforma. Ricevi ricevuta e istruzioni per accedere al posto direttamente.',
    visual: (
      <div className="lp-visual-card">
        <div className="lp-vc-confirmed">
          <div className="lp-vc-confirmed-icon">✓</div>
          <div>
            <div className="lp-vc-confirmed-title">Prenotazione confermata</div>
            <div className="lp-vc-confirmed-sub">Ricevuta inviata via email</div>
          </div>
        </div>
        <hr className="lp-vc-divider" />
        <div className="lp-vc-rows">
          {[['Posto', 'Via Manci 12 – P1'], ['Data', 'Oggi, 09:00–11:00'], ['Totale', '€4,00']].map(([k, v]) => (
            <div key={k} className="lp-vc-row">
              <span className="lp-vc-row-key">{k}</span>
              <span className="lp-vc-row-val">{v}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const FEATURES = [
  { icon: '🗺️', title: 'Mappa in tempo reale',   desc: 'Vedi tutti i posti disponibili su una mappa interattiva con filtri per orario e distanza.' },
  { icon: '📅', title: 'Calendario prenotazioni', desc: 'Gestisci tutte le prenotazioni da un\'unica dashboard con vista calendario mensile.' },
  { icon: '🔒', title: 'Pagamenti sicuri',         desc: 'Transazioni protette direttamente in app. Nessun contante, nessun problema.' },
  { icon: '🚗', title: 'Pubblica il tuo posto',    desc: 'Hai un posto libero? Pubblicalo in pochi click e inizia a guadagnare subito.' },
];

/* ── Componente ──────────────────────────────────────────────────── */
export default function LandingPage({ onLogin, onRegister }) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="lp-root">

      {/* NAVBAR */}
      <nav className="lp-nav">
        <div className="lp-nav-logo">
          <span className="lp-nav-logo-text">Trento<span>Parking</span></span>
        </div>

        <ul className="lp-nav-links">
          <li><a href="#come-funziona">Come funziona</a></li>
          <li><a href="#funzionalita">Funzionalità</a></li>
          <li><a href="#guadagna">Guadagna</a></li>
        </ul>

        <div className="lp-nav-cta">
          <button className="lp-btn-ghost" onClick={onLogin}>Accedi</button>
          <button className="lp-btn-primary" onClick={onRegister}>Registrati gratis</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="lp-hero-wrap">
        <div className="lp-hero">

          <div>
            <div className="lp-hero-eyebrow">🅿 Parcheggio privato a Trento</div>

            <h1 className="lp-hero-title">
              Trova il posto auto<br />
              che ti <span>serve davvero</span>
            </h1>

            <p className="lp-hero-subtitle">
              Prenota posti auto privati a Trento in pochi click.<br></br>
              Senza stress, senza giri a vuoto: trovi, prenoti e paghi tutto dall&apos;app.
            </p>

            <div className="lp-hero-cta">
              <button className="lp-btn-primary lp-btn-primary--lg" onClick={onRegister}>
                Inizia ora
              </button>
              <button className="lp-btn-outline--lg" onClick={onLogin}>
                Accedi
              </button>
            </div>

            <div className="lp-hero-trust">
              <span>✓ Nessuna commissione nascosta</span>
              <span className="lp-trust-dot" />
              <span>✓ Pagamento sicuro</span>
              <span className="lp-trust-dot" />
              <span>✓ Conferma immediata</span>
            </div>
          </div>

          <div className="lp-hero-visual">
            <div className="lp-hero-card">
              <div className="lp-hero-card-header">
                <div>
                  <div className="lp-spot-address">
                    <span className="lp-spot-address-icon">📍</span>
                    Via Manci, 24 — Trento Centro
                  </div>
                  <div className="lp-spot-tags">
                    <span className="lp-spot-tag">Coperto</span>
                    <span className="lp-spot-tag">Disponibile</span>
                    <span className="lp-spot-tag">A 200 m</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="lp-spot-price">€2,50<span>/h</span></div>
                  <span className="lp-spot-badge">Disponibile</span>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <HeroMap height={180} />
              </div>
            </div>


          </div>

        </div>
      </div>

      {/* COME FUNZIONA */}
      <section id="come-funziona" className="lp-section">
        <div className="lp-section-eyebrow">Come funziona</div>
        <h2 className="lp-section-title">Tre passi per parcheggiare</h2>
        <p className="lp-section-sub">
          Dall&apos;app alla chiave in mano: trovare e prenotare un posto auto privato
          non è mai stato così semplice.
        </p>

        <div className="lp-steps-grid">
          <div className="lp-steps-list">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`lp-step-item ${activeStep === i ? 'lp-step-item--active' : ''}`}
                onClick={() => setActiveStep(i)}
              >
                <div className={`lp-step-number ${activeStep === i ? 'lp-step-number--active' : 'lp-step-number--inactive'}`}>
                  {i + 1}
                </div>
                <div className="lp-step-text">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lp-steps-visual">
            {STEPS[activeStep].visual}
          </div>
        </div>
      </section>

      {/* FUNZIONALITÀ */}
      <div id="funzionalita" className="lp-features-bg">
        <div className="lp-features-inner">
          <div className="lp-section-eyebrow" style={{ color: '#2a9d8f' }}>Funzionalità</div>
          <h2 className="lp-features-title">Tutto quello che ti serve</h2>
          <p className="lp-features-sub">
            Una piattaforma completa pensata per chi cerca parcheggio
            e per chi vuole monetizzare il proprio spazio.
          </p>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GUADAGNA */}
      <div id="guadagna" className="lp-host-bg">
        <div className="lp-host-inner lp-host-inner--single">
          <div>
            <div className="lp-section-eyebrow">Per i proprietari</div>
            <h2 className="lp-section-title">Hai un posto auto inutilizzato?</h2>
            <p className="lp-section-sub">
              Pubblica il tuo posto in pochi minuti e inizia a ricevere prenotazioni.
              Decidi tu orari e prezzo — la piattaforma fa il resto.
            </p>
            <div className="lp-host-checklist">
              {[
                'Pubblica gratuitamente il tuo posto',
                'Gestisci disponibilità dal calendario',
                'Ricevi pagamenti in modo sicuro',
                'Assistenza dedicata sempre disponibile',
              ].map(item => (
                <div key={item} className="lp-host-check-item">
                  <span className="lp-host-check-icon">✓</span>
                  {item}
                </div>
              ))}
            </div>
            <button className="lp-btn-primary lp-btn-primary--lg" onClick={onRegister}>
              Pubblica il tuo posto →
            </button>
          </div>
        </div>
      </div>

      {/* CTA FINALE */}
      <div className="lp-cta-section">
        <h2 className="lp-cta-title">Pronto a dire addio alla ricerca del parcheggio?</h2>
        <p className="lp-cta-sub">
          Unisciti a chi ha già smesso di girare in tondo. Crea un account gratuito
          e trova il tuo posto auto a Trento oggi.
        </p>
        <div className="lp-cta-buttons">
          <button className="lp-btn-primary lp-btn-primary--lg" onClick={onRegister}>
            Crea account gratuito
          </button>
          <button className="lp-btn-outline--lg" onClick={onLogin}>
            Accedi
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">
          <span className="lp-nav-logo-text">Trento<span>Parking</span></span>
        </div>
        <div className="lp-footer-copy">
          © {new Date().getFullYear()} Trento Parking. Tutti i diritti riservati.
        </div>
      </footer>

    </div>
  );
}