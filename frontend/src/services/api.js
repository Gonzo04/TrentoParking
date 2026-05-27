const BASE = 'http://localhost:8080/api';

// Funzione centrale per tutte le chiamate HTTP verso il backend
// Così i componenti React non devono ripetere fetch, token e gestione errori
async function request(path, options = {}) {
  const token = localStorage.getItem('authToken');

  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',

      // Se l'utente è loggato, aggiungiamo il token JWT alla richiesta
      // Il backend usa il token per capire quale utente sta facendo l'operazione
      ...(token ? { Authorization: `Bearer ${token}` } : {}),

      // Permette alle singole chiamate di aggiungere eventuali header specifici
      ...options.headers,
    },
  });

  // Alcune risposte potrebbero non avere JSON valido
  // In quel caso usiamo un oggetto vuoto per non rompere il frontend
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Alcune route usano message, altre usano error
    // Controlliamo entrambi per mostrare un messaggio utile
    throw new Error(data.message || data.error || 'Errore di rete');
  }

  return data;
}

export const api = {
  // Auth
  login: (body) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  register: (body) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  me: () => request('/auth/me'),

  // Private spots
  // Alcune versioni del backend restituiscono direttamente un array
  // Altre versioni restituiscono un oggetto con la proprietà posti
  listPosti: async () => {
    const data = await request('/posti-privati');

    if (Array.isArray(data)) {
      return data;
    }

    return data.posti || [];
  },

  // Questa rotta servirà quando collegheremo davvero disponibilità e prenotazioni
  getPostoConPrenotazioni: (id) => request(`/posti-privati/${id}/prenotazioni`),

  // Crea un nuovo posto privato
  // Non mandiamo hostId perché il backend lo ricava dal token JWT
  createPostoPrivato: (body) => request('/posti-privati', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  // Foto posto
  uploadFoto: async (postoId, files) => {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    files.forEach(f => formData.append('foto', f));
    const res = await fetch(`${BASE}/posti-privati/${postoId}/foto`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Errore upload foto');
    return data;
  },

  // Bookings
  listMyBookings: () => request('/bookings'),

  createBooking: (body) => request('/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  payBooking: (id) => request(`/bookings/${id}/pay`, {
    method: 'POST',
  }),

  cancelBooking: (id) => request(`/bookings/${id}`, {
    method: 'DELETE',
  }),
};