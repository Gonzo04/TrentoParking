package com.trentoparking.backend.service

import com.trentoparking.backend.dto.EstimateRequest
import com.trentoparking.backend.dto.EstimateResponse
import org.springframework.stereotype.Service

@Service
class EstimateService {

    fun estimateParking(richiesta: EstimateRequest): EstimateResponse {
        return when {
            richiesta.radiusMeters <= 300 -> {
                EstimateResponse(
                    freeParkingAvailability = "LOW",
                    paidParkingAvailability = "MEDIUM",
                    suggestedArea = "Zona con raggio ristretto",
                    message = "Il raggio selezionato è piccolo: la disponibilità stimata è limitata."
                )
            }

            richiesta.radiusMeters <= 700 -> {
                EstimateResponse(
                    freeParkingAvailability = "MEDIUM",
                    paidParkingAvailability = "HIGH",
                    suggestedArea = "Area urbana vicina",
                    message = "Disponibilità media per i parcheggi gratuiti e alta per quelli a pagamento."
                )
            }

            else -> {
                EstimateResponse(
                    freeParkingAvailability = "HIGH",
                    paidParkingAvailability = "HIGH",
                    suggestedArea = "Area ampia selezionata",
                    message = "Il raggio ampio aumenta le possibilità di trovare parcheggio."
                )
            }
        }
    }
}