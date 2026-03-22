package com.trentoparking.backend.dto

data class EstimateResponse(
    val freeParkingAvailability: String,
    val paidParkingAvailability: String,
    val suggestedArea: String?,
    val message: String
)