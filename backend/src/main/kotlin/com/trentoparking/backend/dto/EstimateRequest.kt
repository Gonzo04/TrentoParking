package com.trentoparking.backend.dto

data class EstimateRequest(
    val areaName: String,
    val radiusMeters: Int
)