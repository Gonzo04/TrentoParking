package com.trentoparking.backend.service

import com.trentoparking.backend.dto.EstimateRequest
import com.trentoparking.backend.dto.EstimateResponse
import org.springframework.stereotype.Service

@Service
class EstimateService {

    fun estimateParking(request: EstimateRequest): EstimateResponse {
        val area = request.areaName.lowercase()

        return when {
            area.contains("centro") || area.contains("duomo") || area.contains("fiera") -> {
                EstimateResponse(
                    freeParkingAvailability = "LOW",
                    paidParkingAvailability = "HIGH",
                    suggestedArea = "Parcheggio Monte Baldo",
                    message = "Zona centrale: bassa disponibilità di parcheggi gratuiti, alta disponibilità di parcheggi a pagamento."
                )
            }

            area.contains("stazione") -> {
                EstimateResponse(
                    freeParkingAvailability = "LOW",
                    paidParkingAvailability = "MEDIUM",
                    suggestedArea = "Zona Cristo Re",
                    message = "Area vicina alla stazione: disponibilità gratuita limitata e disponibilità a pagamento moderata."
                )
            }

            else -> {
                EstimateResponse(
                    freeParkingAvailability = "MEDIUM",
                    paidParkingAvailability = "MEDIUM",
                    suggestedArea = null,
                    message = "Disponibilità media stimata sia per i parcheggi gratuiti sia per quelli a pagamento."
                )
            }
        }
    }
}