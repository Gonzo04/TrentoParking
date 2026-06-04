import React, { useState } from 'react';
import { Mail } from 'lucide-react'; // Icona mail
import { resendVerificationEmail } from '../../services/authService'
const EmailVerificationPage = ({email}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleResend() {
    try {
      setLoading(true);
      setMessage('');

      await resendVerificationEmail(email);

      setMessage('Email inviata nuovamente!');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-panel">
      <div className="text-center p-8">

        <h1 className="text-[#003049] text-2xl font-bold mb-4">
          Verifica la tua email <Mail className="w-10 h-10 text-[#2a9d8f] " />
        </h1>

        <p className="text-gray-600 mb-8 leading-relaxed">
          Abbiamo inviato un link di conferma all' inidirizzo email: {email} <br />
          Controlla la sua posta in arrivo per attivare il profilo.
        </p>

        {/* Sezione Footer / Azioni Secondarie */}
        <div className="border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500 mb-4">
            Non hai ricevuto l'email?
          </p>
          <button
            onClick={handleResend}
            disabled={loading}
            className="primary-button mt-4"
            >
            {loading ? 'Invio...' : 'Inviamene un’altra'}
          </button>
          {message && (
            <p className="text-sm text-gray-500 mt-4">
              {message}
            </p>
          )}
        </div>

        {/* Link per tornare indietro o supporto */}
        <p className="mt-8 text-xs text-gray-400">
          Hai sbagliato indirizzo? 
        </p>
        <button
          className="primary-button mt-4"
          onClick={() => window.location.reload()}
        >
          Torna alla registrazione
        </button>
      </div>
    </div>
  );
};

export default EmailVerificationPage;