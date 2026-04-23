package com.trentoparking.backend.dto
// Questa classe rappresenta la risposta che il backend invia al frontend
// Verrà convertita in JSON da Spring
data class EstimateResponse(

    // Disponibilità stimata dei parcheggi gratuiti: LOW / MEDIUM / HIGH
    val freeParkingAvailability: String,

    // Disponibilità stimata dei parcheggi a pagamento: LOW / MEDIUM / HIGH
    val paidParkingAvailability: String,

    // Eventuale Are suggerita dal sistema, se utile
    val suggestedArea: String?,

    // Messaggio testuale più leggibile per l'utente
    val message: String
)