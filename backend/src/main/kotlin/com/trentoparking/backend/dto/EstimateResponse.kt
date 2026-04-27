package com.trentoparking.backend.dto

data class EstimateResponse(

    // Disponibilità stimata dei parcheggi gratuiti: LOW / MEDIUM / HIGH
    val freeParkingAvailability: String,

    // Disponibilità stimata dei parcheggi a pagamento: LOW / MEDIUM / HIGH
    val paidParkingAvailability: String,

    // Eventuale area/parcheggio suggerito dal sistema
    val suggestedArea: String?,

    // Messaggio testuale più leggibile per l'utente
    val message: String,

    // Lista dei parcheggi trovati entro il raggio selezionato
    val parkingsInRadius: List<ParkingInRadiusDto>
)