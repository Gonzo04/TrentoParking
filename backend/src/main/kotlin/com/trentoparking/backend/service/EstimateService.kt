package com.trentoparking.backend.service

import com.trentoparking.backend.domain.TipoParcheggio
import com.trentoparking.backend.dto.EstimateRequest
import com.trentoparking.backend.dto.EstimateResponse
import org.springframework.stereotype.Service
import kotlin.math.PI
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

@Service
class EstimateService(
    private val servizioParcheggi: ServizioParcheggi
) {

    fun estimateParking(richiesta: EstimateRequest): EstimateResponse {

        // Recuperiamo tutti i parcheggi disponibili nella nostra sorgente dati.
        val tuttiIParcheggi = servizioParcheggi.ottieniTuttiIParcheggi()

        // Filtriamo solo i parcheggi che cadono entro il raggio selezionato.
        val parcheggiNelRaggio = tuttiIParcheggi.filter { parcheggio ->
            distanzaMetri(
                richiesta.centerLat,
                richiesta.centerLng,
                parcheggio.posizione.latitudine,
                parcheggio.posizione.longitudine
            ) <= richiesta.radiusMeters
        }

        // Separiamo i parcheggi gratuiti da quelli a pagamento.
        val parcheggiGratuiti = parcheggiNelRaggio.filter { it.tipo == TipoParcheggio.GRATUITO }
        val parcheggiPagamento = parcheggiNelRaggio.filter { it.tipo == TipoParcheggio.PAGAMENTO }

        // Sommiamo i posti stimati/disponibili per ciascuna categoria.
        val postiGratuiti = parcheggiGratuiti.sumOf { it.postiDisponibiliStimati }
        val postiPagamento = parcheggiPagamento.sumOf { it.postiDisponibiliStimati }

        // Convertiamo i valori numerici in livelli qualitativi.
        val disponibilitaGratuiti = convertiInLivello(postiGratuiti)
        val disponibilitaPagamento = convertiInLivello(postiPagamento)

        // Scegliamo una zona/parcheggio suggerito:
        // per semplicità proponiamo il parcheggio con più posti disponibili nel raggio.
        val parcheggioSuggerito = parcheggiNelRaggio.maxByOrNull { it.postiDisponibiliStimati }

        val messaggio = if (parcheggiNelRaggio.isEmpty()) {
            "Non sono stati trovati parcheggi nel raggio selezionato."
        } else {
            "Nel raggio selezionato sono stati trovati ${parcheggiNelRaggio.size} parcheggi."
        }

        return EstimateResponse(
            freeParkingAvailability = disponibilitaGratuiti,
            paidParkingAvailability = disponibilitaPagamento,
            suggestedArea = parcheggioSuggerito?.nome,
            message = messaggio
        )
    }

    // Questa funzione traduce un numero di posti in una categoria qualitativa.
    private fun convertiInLivello(posti: Int): String {
        return when {
            posti <= 0 -> "LOW"
            posti <= 30 -> "MEDIUM"
            else -> "HIGH"
        }
    }

    // Formula di Haversine:
    // serve a calcolare la distanza approssimativa tra due coordinate geografiche.
    private fun distanzaMetri(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ): Double {
        val raggioTerra = 6_371_000.0

        val deltaLat = (lat2 - lat1) * PI / 180
        val deltaLon = (lon2 - lon1) * PI / 180

        val a = sin(deltaLat / 2).pow(2) +
                cos(lat1 * PI / 180) * cos(lat2 * PI / 180) * sin(deltaLon / 2).pow(2)

        return raggioTerra * 2 * asin(sqrt(a))
    }
}