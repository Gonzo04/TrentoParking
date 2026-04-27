package com.trentoparking.backend.dto

data class ParkingInRadiusDto(
    val id: String,
    val name: String,
    val type: String,
    val lat: Double,
    val lng: Double,
    val estimatedAvailableSpots: Int,
    val distanceMeters: Double
)
