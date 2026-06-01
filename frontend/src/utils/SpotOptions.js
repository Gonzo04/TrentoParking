// Giorni usati negli editor del frontend
// Il backend li normalizza e li salva in maiuscolo senza accenti
export const GIORNI = [
  { key: 'lunedi', short: 'Lun', full: 'Lunedì' },
  { key: 'martedi', short: 'Mar', full: 'Martedì' },
  { key: 'mercoledi', short: 'Mer', full: 'Mercoledì' },
  { key: 'giovedi', short: 'Gio', full: 'Giovedì' },
  { key: 'venerdi', short: 'Ven', full: 'Venerdì' },
  { key: 'sabato', short: 'Sab', full: 'Sabato' },
  { key: 'domenica', short: 'Dom', full: 'Domenica' },
]

// Tag selezionabili per descrivere meglio un posto privato
// Sono valori tecnici stabili, mentre label ed emoji servono solo alla UI
export const TAGS = [
  { key: 'coperto', emoji: '🏠', label: 'Coperto' },
  { key: 'vicino_centro', emoji: '📍', label: 'Vicino al centro' },
  { key: 'sorvegliato', emoji: '🔒', label: 'Sorvegliato' },
  { key: 'carica_elettrica', emoji: '⚡', label: 'Ricarica EV' },
  { key: 'facile_accesso', emoji: '✅', label: 'Facile accesso' },
  { key: 'accessibile', emoji: '♿', label: 'Accessibile' },
]