package com.trentoparking.backend.dto

data class EstimateRequest(
    val centerLat: Double,
    val centerLng: Double,
    val radiusMeters: Int
)