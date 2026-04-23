package com.trentoparking.backend.domain

// Questa classe rappresenta un punto geografico.
// La useremo per memorizzare latitudine e longitudine di un parcheggio.
data class Posizione(
    val latitudine: Double,
    val longitudine: Double
)