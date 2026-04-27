package com.trentoparking.backend.controller

import com.trentoparking.backend.dto.EstimateRequest
import com.trentoparking.backend.dto.EstimateResponse
import com.trentoparking.backend.service.EstimateService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
@RestController
@RequestMapping("/api")
class EstimateController(
    private val servizioStima: EstimateService
) {

    @PostMapping("/estimate")
    fun estimate(@RequestBody richiesta: EstimateRequest): EstimateResponse {

        if (richiesta.radiusMeters <= 0) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Il raggio di ricerca deve essere maggiore di 0."
            )
        }

        if (richiesta.centerLat < -90 || richiesta.centerLat > 90) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Latitudine non valida."
            )
        }

        if (richiesta.centerLng < -180 || richiesta.centerLng > 180) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Longitudine non valida."
            )
        }

        return servizioStima.estimateParking(richiesta)
    }
}