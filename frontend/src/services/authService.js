// URL base delle API backend.
// In sviluppo Vite gira di solito su http://localhost:5173,
// mentre il backend Express gira su http://localhost:8080.
// Se in futuro vogliamo cambiare URL, possiamo usare una variabile VITE_API_BASE_URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Funzione interna usata da tutte le chiamate HTTP.
// Centralizziamo qui la gestione di fetch, JSON ed errori,
// così i metodi register/login/me/logout restano più puliti.
async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let data = {};

  // Proviamo a leggere la risposta come JSON.
  // Se il backend non restituisce JSON valido, evitiamo che l'app crashi.
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  // Se lo status HTTP non è 2xx, trasformiamo la risposta in un errore JS.
  // In questo modo il componente React può mostrare il messaggio all'utente.
  if (!response.ok) {
    throw new Error(data.message || 'Errore durante la comunicazione con il server');
  }

  return data;
}

// Registra un nuovo utente.
// Il controllo lato frontend migliora l'esperienza utente,
// ma la vera validazione di sicurezza resta nel backend.
export async function registerUser({ nome, cognome, nomeUtente, email, password, targa }) {
  return requestJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      nome,
      cognome,
      nomeUtente,
      email,
      password,
      targa
    })
  });
}

// Effettua il login.
// Usiamo identifier perché l'utente può inserire email oppure nome utente.
export async function loginUser({ identifier, password }) {
  return requestJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier,
      password
    })
  });
}

// Recupera l'utente attualmente autenticato usando il token JWT.
// Il token viene inviato nell'header Authorization secondo lo standard Bearer.
export async function getCurrentUser(token) {
  return requestJson('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Esegue il logout lato backend.
// In questa versione il backend non invalida davvero il JWT,
// però manteniamo questa chiamata perché rende il flusso più chiaro
// e lascia spazio a miglioramenti futuri.
export async function logoutUser(token) {
  return requestJson('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}


export async function resendVerificationEmail(email) {
  return requestJson('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}