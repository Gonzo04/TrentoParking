package com.trentoparking.backend.domain

// Questa classe rappresenta un parcheggio del nostro dominio.
// Per ora i dati sono semplici, ma già abbastanza utili per fare stime.
data class Parcheggio(
    val id: String,
    val nome: String,
    val tipo: TipoParcheggio,
    val posizione: Posizione,

    // Per i parcheggi a pagamento questo numero ha senso come dato reale.
    // Per i gratuiti per ora lo usiamo come stima indicativa.
    val postiDisponibiliStimati: Int
)