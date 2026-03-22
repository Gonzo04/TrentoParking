package com.trentoparking.backend.controller

import com.trentoparking.backend.dto.EstimateRequest
import com.trentoparking.backend.dto.EstimateResponse
import com.trentoparking.backend.service.EstimateService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api")
class EstimateController(
    private val estimateService: EstimateService
) {

    @PostMapping("/estimate")
    fun estimate(@RequestBody request: EstimateRequest): EstimateResponse {
        return estimateService.estimateParking(request)
    }
}