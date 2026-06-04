import React, { useState } from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { resetPassword } from '../../services/authService'

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const ResetPasswordPage = ({ token, onSuccess }) => {

  console.log("TOKEN RESET:", token);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(event) {

    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    if (!password || !confirmPassword) {
      setErrorMessage('Compila tutti i campi');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setErrorMessage(
        'La password deve avere almeno 8 caratteri, una lettera maiuscola e un numero'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Le password non coincidono');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);

      setSuccessMessage(
        'Password aggiornata con successo!'
      );

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);

    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-panel">

      <div className="text-center p-8">

        <h1 className="text-[#003049] text-2xl font-bold mb-6 flex items-center justify-center gap-3">
          Reimposta password <Lock className="w-8 h-8 text-[#2a9d8f]" />
        </h1>

        <p className="text-gray-600 mb-8 leading-relaxed">
          Inserisci una nuova password sicura per il tuo account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>

          <label>
            Nuova password

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nuova password"
              autoComplete="new-password"
            />
          </label>

          <label>
            Conferma password

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Conferma password"
              autoComplete="new-password"
            />
          </label>

          <p className="password-rules">
            La password deve avere almeno 8 caratteri,
            una lettera maiuscola e un numero.
          </p>

          {errorMessage && (
            <p className="error-message">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="success-message flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? 'Aggiornamento in corso...' : 'Aggiorna password'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default ResetPasswordPage;