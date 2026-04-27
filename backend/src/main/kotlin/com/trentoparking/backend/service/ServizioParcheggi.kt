package com.trentoparking.backend.service

import com.trentoparking.backend.domain.Parcheggio
import com.trentoparking.backend.domain.Posizione
import com.trentoparking.backend.domain.TipoParcheggio
import org.springframework.stereotype.Service

@Service
class ServizioParcheggi {

    fun ottieniParcheggiGratuiti(): List<Parcheggio> {
        return listOf(
            Parcheggio(
                id = "P3",
                nome = "Parcheggio Sanseverino",
                tipo = TipoParcheggio.GRATUITO,
                posizione = Posizione(46.0732, 11.1140),
                postiDisponibiliStimati = 25
            ),
            Parcheggio(
                id = "P4",
                nome = "Parcheggio Ex Italcementi",
                tipo = TipoParcheggio.GRATUITO,
                posizione = Posizione(46.0705, 11.1085),
                postiDisponibiliStimati = 18
            )
        )
    }

    fun ottieniParcheggiPagamento(): List<Parcheggio> {
        return listOf(
            Parcheggio(
                id = "P1",
                nome = "Parcheggio Monte Baldo",
                tipo = TipoParcheggio.PAGAMENTO,
                posizione = Posizione(46.0677, 11.1215),
                postiDisponibiliStimati = 85
            ),
            Parcheggio(
                id = "P2",
                nome = "Parcheggio Piazza Fiera",
                tipo = TipoParcheggio.PAGAMENTO,
                posizione = Posizione(46.0648, 11.1258),
                postiDisponibiliStimati = 40
            ),
            Parcheggio(
                id = "P5",
                nome = "Parcheggio Stazione Trento",
                tipo = TipoParcheggio.PAGAMENTO,
                posizione = Posizione(46.0735, 11.1218),
                postiDisponibiliStimati = 30
            )
        )
    }

    fun ottieniTuttiIParcheggi(): List<Parcheggio> {
        return ottieniParcheggiGratuiti() + ottieniParcheggiPagamento()
    }
}