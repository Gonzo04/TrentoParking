import { useEffect, useState } from 'react';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser
} from '../services/authService';

// Regole di validazione usate nel frontend.
// Sono le stesse del backend, così l'utente riceve subito feedback prima dell'invio.
// La sicurezza però resta nel backend, perché il frontend può essere aggirato.
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const TARGA_REGEX = /^[A-Z0-9]{5,10}$/;

function AuthPanel({ onAuthChange, onRegisterSuccess, verificationSuccess }) {
  const [mode, setMode] = useState('login');

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    nome: '',
    cognome: '',
    nomeUtente: '',
    targa: '',
    email: '',
    password: '',
    confermaPassword: ''
  });

  // All'avvio del componente controlliamo se esiste già un token salvato.
  // Se il token è valido, recuperiamo l'utente e manteniamo la sessione anche dopo refresh.
  useEffect(() => {
    async function loadUserFromToken() {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setInitialLoading(false);

        if (onAuthChange) {
          onAuthChange(null);
        }

        return;
      }

      try {
        const data = await getCurrentUser(token);
        setCurrentUser(data.user);

        if (onAuthChange) {
          onAuthChange(data.user);
        }
      } catch {
        // Se il token non è più valido, lo eliminiamo per evitare stati incoerenti.
        localStorage.removeItem('authToken');
        setCurrentUser(null);

        if (onAuthChange) {
          onAuthChange(null);
        }
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

    setLoginForm((previousForm) => ({
      ...previousForm,
      [name]: value
    }));
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target;

    // La targa viene mostrata già in maiuscolo per coerenza con il backend.
    const normalizedValue = name === 'targa' ? value.toUpperCase() : value;

    setRegisterForm((previousForm) => ({
      ...previousForm,
      [name]: normalizedValue
    }));
  }

  function validateRegisterForm() {
    const nome = registerForm.nome.trim();
    const cognome = registerForm.cognome.trim();
    const nomeUtente = registerForm.nomeUtente.trim();
    const email = registerForm.email.trim();
    const targa = registerForm.targa.trim().toUpperCase();

    if (!nome || !cognome || !nomeUtente || !email || !registerForm.password || !targa) {
      return 'Compila tutti i campi obbligatori';
    }

    if (!USERNAME_REGEX.test(nomeUtente)) {
      return 'Il nome utente deve avere 3-30 caratteri e può contenere solo lettere, numeri, punto, trattino e underscore';
    }

    if (!PASSWORD_REGEX.test(registerForm.password)) {
      return 'La password deve avere almeno 8 caratteri, una lettera maiuscola e un numero';
    }

    if (registerForm.password !== registerForm.confermaPassword) {
      return 'Le due password non coincidono';
    }

    if (!TARGA_REGEX.test(targa)) {
      return 'La targa deve contenere solo lettere e numeri, da 5 a 10 caratteri';
    }

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
      const data = await loginUser({
        identifier,
        password: loginForm.password
      });

      localStorage.setItem('authToken', data.token);
      setCurrentUser(data.user);

      if (onAuthChange) {
        onAuthChange(data.user);
      }

      setSuccessMessage('Login effettuato con successo');

      setLoginForm({
        identifier: '',
        password: ''
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    resetMessages();

    const validationError = validateRegisterForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({
        nome: registerForm.nome.trim(),
        cognome: registerForm.cognome.trim(),
        nomeUtente: registerForm.nomeUtente.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        targa: registerForm.targa.trim().toUpperCase()
      });
      
      if (onRegisterSuccess) {
        onRegisterSuccess(registerForm.email.trim());
      } 
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    resetMessages();

    const token = localStorage.getItem('authToken');

    setLoading(true);

    try {
      if (token) {
        await logoutUser(token);
      }
    } catch {
      // Anche se la chiamata al backend fallisce, rimuoviamo comunque il token locale.
      // In questa versione il logout reale dipende dal frontend.
    } finally {
      localStorage.removeItem('authToken');
      setCurrentUser(null);

      if (onAuthChange) {
        onAuthChange(null);
      }

      setSuccessMessage('Logout effettuato');
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
        <h2>Area utente</h2>
        <p>Controllo sessione in corso...</p>
      </section>
    );
  }

  if (currentUser) {
    return (
      <section className="auth-panel">
        <h2>Il tuo account</h2>

        <div className="user-card">
          <p>
            <strong>Nome:</strong> {currentUser.nome} {currentUser.cognome}
          </p>

          <p>
            <strong>Nome utente:</strong> {currentUser.nomeUtente}
          </p>

          <p>
            <strong>Email:</strong> {currentUser.email}
          </p>

          <p>
            <strong>Targa:</strong> {currentUser.targa}
          </p>

          <p>
            <strong>Ruolo:</strong> {currentUser.ruolo}
          </p>

          <p>
            <strong>Punti:</strong> {currentUser.punti}
          </p>

          <p>
            <strong>Livello:</strong> {currentUser.livello}
          </p>
        </div>

        {successMessage && <p className="success-message">{successMessage}</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <button
          type="button"
          className="primary-button"
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? 'Uscita in corso...' : 'Logout'}
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <h2>Accesso</h2>

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'tab-button active' : 'tab-button'}
          onClick={() => switchMode('login')}
        >
          Login
        </button>

        <button
          type="button"
          className={mode === 'register' ? 'tab-button active' : 'tab-button'}
          onClick={() => switchMode('register')}
        >
          Registrazione
        </button>
      </div>

      {mode === 'login' && (
        <form className="auth-form" onSubmit={handleLoginSubmit}>
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
                placeholder="Password"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowLoginPassword((previousValue) => !previousValue)}
              >
                {showLoginPassword ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </label>

          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {successMessage && (<p className="success-message">{successMessage}</p>)}
          {verificationSuccess && (<p className="success-message">Email verificata con successo! Ora puoi accedere.</p>)}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form className="auth-form" onSubmit={handleRegisterSubmit}>
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
                placeholder="Password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowRegisterPassword((previousValue) => !previousValue)}
              >
                {showRegisterPassword ? 'Nascondi' : 'Mostra'}
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
                className="secondary-button"
                onClick={() => setShowConfirmPassword((previousValue) => !previousValue)}
              >
                {showConfirmPassword ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </label>

          <p className="password-rules">
            La password deve avere almeno 8 caratteri, una lettera maiuscola e un numero.
            Il nome utente può contenere lettere, numeri, punto, trattino e underscore.
          </p>

          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>
      )}
    </section>
  );
}

export default AuthPanel;