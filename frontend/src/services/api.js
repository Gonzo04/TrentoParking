const BASE = 'http://localhost:8080/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore di rete');
  return data;
}

export const api = {
  // Auth
  login:    (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me:       ()     => request('/auth/me'),

  // Spots (browsing)
  listPosti:               ()   => request('/bookings/posti'),
  getPostoConPrenotazioni: (id) => request(`/bookings/posti/${id}`),

  // Bookings
  listMyBookings: ()     => request('/bookings'),
  createBooking:  (body) => request('/bookings',         { method: 'POST',   body: JSON.stringify(body) }),
  payBooking:     (id)   => request(`/bookings/${id}/pay`, { method: 'POST' }),
  cancelBooking:  (id)   => request(`/bookings/${id}`,   { method: 'DELETE' }),
};
