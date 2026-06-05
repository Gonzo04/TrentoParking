import './AuthPage.css'
import AuthPanel from '../features/auth/AuthPanel'
import ResetPasswordPage from '../features/auth/ResetPassword'
import EmailVerificationPage from '../features/auth/VerificaMail'

function AuthPage({
  authInitialTab,
  onAuthChange,
  verificationSuccess,
  verificationExpired,
  resetSuccess,
  onRegisterSuccess,
  waitingVerification,
  pendingEmail,
  resetToken,
  onBack,
}) {
  return (
    <div className="ap-root">
      {/* ── Panello di sinistra ─────────────────────────────────────── */}
      <div className="ap-brand-panel">
        <button className="ap-back-btn" onClick={onBack}>
          ← Torna alla home
        </button>

        <div className="ap-brand-content">
          <div className="ap-logo">
            <span className="ap-logo-trento">Trento</span>
            <span className="ap-logo-parking">Parking</span>
          </div>

          <p className="ap-brand-tagline">
            Il modo più semplice per trovare e condividere posti auto a Trento.
          </p>

          <ul className="ap-brand-features">
            <li>Prenota un posto in pochi click</li>
            <li>Trova disponibilità nelle tue vicinanze</li>
            <li>Guadagna condividendo il tuo posto</li>
          </ul>
        </div>

        <p className="ap-brand-footer">
          &copy; {new Date().getFullYear()} TrentoParking
        </p>
      </div>

      {/* ── Panello di destra ─────────────────────────────────────── */}
      <div className="ap-form-panel">
        <div className="ap-form-card">
          {/* Header solo da mobile */}
          <div className="ap-mobile-header">
            <div className="ap-logo">
              <span className="ap-logo-trento">Trento</span>
              <span className="ap-logo-parking">Parking</span>
            </div>
            <button className="ap-back-link" onClick={onBack}>
              ← Home
            </button>
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
              initialTab={authInitialTab}
              onAuthChange={onAuthChange}
              verificationSuccess={verificationSuccess}
              verificationExpired={verificationExpired}
              resetSuccess={resetSuccess}
              onRegisterSuccess={onRegisterSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
