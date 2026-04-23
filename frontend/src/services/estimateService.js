// Questa funzione invia al backend le coordinate selezionate sulla mappa
// e il raggio di ricerca.
export async function estimateParking({ centerLat, centerLng, radiusMeters }) {
  const response = await fetch('http://localhost:8080/api/estimate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      centerLat,
      centerLng,
      radiusMeters,
    }),
  })

  // Se il backend risponde con errore, proviamo a leggere il messaggio.
  if (!response.ok) {
    let errorMessage = 'Errore nella chiamata al backend'

    try {
      const errorData = await response.json()
      if (errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // Se la risposta di errore non è JSON, manteniamo il messaggio generico.
    }

    throw new Error(errorMessage)
  }

  return response.json()
}