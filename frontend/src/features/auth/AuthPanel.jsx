import { useEffect, useRef, useState } from 'react';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  richiediResetPassword
} from '../../services/authService';

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const TARGA_REGEX = /^[A-Z0-9]{5,10}$/;

/* ── SVG icons ───────────────────────────────────────────────────── */
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────────── */
function AuthPanel({ onAuthChange, onRegisterSuccess, verificationSuccess, resetSuccess, initialTab }) {
  const [mode, setMode] = useState(initialTab ?? 'login');

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Guardia contro il doppio submit: React aggiorna il DOM in modo asincrono,
  // quindi il pulsante potrebbe non essere ancora disabilitato nel brevissimo
  // lasso tra il primo click e il re-render con loading=true.
  const isSubmitting = useRef(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [registerForm, setRegisterForm] = useState({
    nome: '',
    cognome: '',
    nomeUtente: '',
    targa: '',
    email: '',
    password: '',
    confermaPassword: ''
  });

  useEffect(() => {
    if (initialTab) setMode(initialTab);
  }, [initialTab]);

  useEffect(() => {
    async function loadUserFromToken() {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setInitialLoading(false);
        if (onAuthChange) onAuthChange(null);
        return;
      }

      try {
        const data = await getCurrentUser(token);
        setCurrentUser(data.user);
        if (onAuthChange) onAuthChange(data.user);
      } catch {
        localStorage.removeItem('authToken');
        setCurrentUser(null);
        if (onAuthChange) onAuthChange(null);
      } finally {
        setInitialLoading(false);
      }
    }

    loadUserFromToken();
  }, [onAuthChange]);

  function resetMessages() {
    setErrorMessage('');
    setSuccessMessage('');
  }

  function handleLoginChange(event) {
    const { name, value } = event.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target;
    const normalizedValue = name === 'targa' ? value.toUpperCase() : value;
    setRegisterForm(prev => ({ ...prev, [name]: normalizedValue }));
  }

  function validateRegisterForm() {
    const nome = registerForm.nome.trim();
    const cognome = registerForm.cognome.trim();
    const nomeUtente = registerForm.nomeUtente.trim();
    const email = registerForm.email.trim();
    const targa = registerForm.targa.trim().toUpperCase();

    if (!nome || !cognome || !nomeUtente || !email || !registerForm.password || !targa)
      return 'Compila tutti i campi obbligatori';
    if (!USERNAME_REGEX.test(nomeUtente))
      return 'Il nome utente deve avere 3-30 caratteri e può contenere solo lettere, numeri, punto, trattino e underscore';
    if (!PASSWORD_REGEX.test(registerForm.password))
      return 'La password deve avere almeno 8 caratteri, una lettera maiuscola e un numero';
    if (registerForm.password !== registerForm.confermaPassword)
      return 'Le due password non coincidono';
    if (!TARGA_REGEX.test(targa))
      return 'La targa deve contenere solo lettere e numeri, da 5 a 10 caratteri';

    return '';
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    resetMessages();

    const identifier = loginForm.identifier.trim();
    if (!identifier || !loginForm.password) {
      setErrorMessage('Inserisci email/nome utente e password');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser({ identifier, password: loginForm.password });
      localStorage.setItem('authToken', data.token);
      setCurrentUser(data.user);
      if (onAuthChange) onAuthChange(data.user);
      setSuccessMessage('Login effettuato con successo');
      setLoginForm({ identifier: '', password: '' });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    resetMessages();

    const validationError = validateRegisterForm();
    if (validationError) {
      setErrorMessage(validationError);
      isSubmitting.current = false;
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        nome: registerForm.nome.trim(),
        cognome: registerForm.cognome.trim(),
        nomeUtente: registerForm.nomeUtente.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        targa: registerForm.targa.trim().toUpperCase()
      });

      if (onRegisterSuccess) onRegisterSuccess(registerForm.email.trim());
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }

  async function handleLogout() {
    resetMessages();
    const token = localStorage.getItem('authToken');
    setLoading(true);
    try {
      if (token) await logoutUser(token);
    } catch {
      // logout locale anche se il backend fallisce
    } finally {
      localStorage.removeItem('authToken');
      setCurrentUser(null);
      if (onAuthChange) onAuthChange(null);
      setSuccessMessage('Logout effettuato');
      setLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    resetMessages();

    const email = forgotEmail.trim();
    if (!email) {
      setErrorMessage('Inserisci la tua email per recuperare la password');
      return;
    }

    setLoading(true);
    try {
      await richiediResetPassword(email);
      setForgotEmail('');
      setSuccessMessage('Ti abbiamo inviato una email per il reset della password');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    resetMessages();
    setMode(nextMode);
  }

  if (initialLoading) {
    return (
      <section className="auth-panel">
        <p>Controllo sessione in corso...</p>
      </section>
    );
  }

  if (currentUser) {
    return (
      <section className="auth-panel">
        <h2>Il tuo account</h2>

        <div className="user-card">
          <p><strong>Nome:</strong> {currentUser.nome} {currentUser.cognome}</p>
          <p><strong>Nome utente:</strong> {currentUser.nomeUtente}</p>
          <p><strong>Email:</strong> {currentUser.email}</p>
          <p><strong>Targa:</strong> {currentUser.targa}</p>
          <p><strong>Ruolo:</strong> {currentUser.ruolo}</p>
          <p><strong>Punti:</strong> {currentUser.punti}</p>
          <p><strong>Livello:</strong> {currentUser.livello}</p>
        </div>

        {successMessage && <p className="success-message">{successMessage}</p>}
        {errorMessage   && <p className="error-message">{errorMessage}</p>}

        <button type="button" className="primary-button" onClick={handleLogout} disabled={loading}>
          {loading ? 'Uscita in corso...' : 'Logout'}
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'tab-button active' : 'tab-button'}
          onClick={() => switchMode('login')}
        >
          Accedi
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'tab-button active' : 'tab-button'}
          onClick={() => switchMode('register')}
        >
          Registrati
        </button>
      </div>

      {/* ── Login ─────────────────────────────────────────────────── */}
      {mode === 'login' && (
        <form className="auth-form" onSubmit={handleLoginSubmit}>
          <div className="ap-form-heading">
            <h3>Bentornato</h3>
            <p>Accedi al tuo account TrentoParking</p>
          </div>

          <label>
            Email o nome utente
            <input
              type="text"
              name="identifier"
              value={loginForm.identifier}
              onChange={handleLoginChange}
              placeholder="email@example.com oppure nomeutente"
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <div className="password-row">
              <input
                type={showLoginPassword ? 'text' : 'password'}
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                placeholder="La tua password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="ap-eye-btn"
                onClick={() => setShowLoginPassword(v => !v)}
                aria-label={showLoginPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showLoginPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          {errorMessage   && <p className="error-message">{errorMessage}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}
          {verificationSuccess && (
            <p className="success-message">Email verificata! Ora puoi accedere.</p>
          )}
          {resetSuccess && (
            <p className="success-message">Password aggiornata! Ora puoi accedere.</p>
          )}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>

          <button
            type="button"
            className="ap-forgot-link"
            onClick={() => switchMode('forgotPassword')}
          >
            Password dimenticata?
          </button>
        </form>
      )}

      {/* ── Forgot password ───────────────────────────────────────── */}
      {mode === 'forgotPassword' && (
        <form className="auth-form" onSubmit={handleForgotPassword}>
          <div className="ap-form-heading">
            <h3>Recupera password</h3>
            <p>Ti invieremo un link per reimpostarla</p>
          </div>

          <label>
            Email
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="mario.rossi@example.com"
              autoComplete="email"
            />
          </label>

          {errorMessage   && <p className="error-message">{errorMessage}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Invio in corso…' : 'Invia link reset'}
          </button>

          <button
            type="button"
            className="ap-back-to-login"
            onClick={() => switchMode('login')}
          >
            ← Torna al login
          </button>
        </form>
      )}

      {/* ── Registrazione ──────────────────────────────────────────────── */}
      {mode === 'register' && (
        <form className="auth-form" onSubmit={handleRegisterSubmit}>
          <div className="ap-form-heading">
            <h3>Crea il tuo account</h3>
            <p>Registrati gratuitamente in pochi secondi</p>
          </div>

          {/* Nome + Cognome affiancati */}
          <div className="auth-row-2">
            <label>
              Nome
              <input
                type="text"
                name="nome"
                value={registerForm.nome}
                onChange={handleRegisterChange}
                placeholder="Mario"
                autoComplete="given-name"
              />
            </label>
            <label>
              Cognome
              <input
                type="text"
                name="cognome"
                value={registerForm.cognome}
                onChange={handleRegisterChange}
                placeholder="Rossi"
                autoComplete="family-name"
              />
            </label>
          </div>

          <label>
            Nome utente
            <input
              type="text"
              name="nomeUtente"
              value={registerForm.nomeUtente}
              onChange={handleRegisterChange}
              placeholder="mario.rossi"
              autoComplete="username"
            />
          </label>

          <label>
            Targa
            <input
              type="text"
              name="targa"
              value={registerForm.targa}
              onChange={handleRegisterChange}
              placeholder="AB123CD"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={registerForm.email}
              onChange={handleRegisterChange}
              placeholder="mario.rossi@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <div className="password-row">
              <input
                type={showRegisterPassword ? 'text' : 'password'}
                name="password"
                value={registerForm.password}
                onChange={handleRegisterChange}
                placeholder="Almeno 8 caratteri"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="ap-eye-btn"
                onClick={() => setShowRegisterPassword(v => !v)}
                aria-label={showRegisterPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showRegisterPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <label>
            Conferma password
            <div className="password-row">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confermaPassword"
                value={registerForm.confermaPassword}
                onChange={handleRegisterChange}
                placeholder="Ripeti la password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="ap-eye-btn"
                onClick={() => setShowConfirmPassword(v => !v)}
                aria-label={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <p className="password-rules">
            La password deve avere almeno 8 caratteri, una lettera maiuscola e un numero.
            Il nome utente può contenere lettere, numeri, punto, trattino e underscore.
          </p>

          {errorMessage   && <p className="error-message">{errorMessage}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Registrazione in corso…' : 'Crea account'}
          </button>
        </form>
      )}
    </section>
  );
}

export default AuthPanel;
