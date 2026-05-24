const PostoPrivato = require('../models/PostoPrivato');
const Utente = require('../models/Utente');

function buildPostoResponse(posto) {
    return {
        id: posto._id,
        hostId: posto.hostId,
        nome: posto.nome,
        descrizione: posto.descrizione,
        posizione: posto.posizione,
        tariffaOraria: posto.tariffaOraria,
        attivo: posto.attivo,
        disponibilita: posto.disponibilita,
        statoVerifica: posto.statoVerifica,
        dichiarazioneProprietaAccettata: posto.dichiarazioneProprietaAccettata,
        dataDichiarazioneProprieta: posto.dataDichiarazioneProprieta,
        noteVerifica: posto.noteVerifica,
        createdAt: posto.createdAt,
        updatedAt: posto.updatedAt
    };
}

function normalizeNumber(value) {
    if (value === null || value === undefined || value === '') {
        return NaN;
    }

    return Number(value);
}

async function listPostiPrivati(req, res) {
    try {
        // Per ora mostriamo solo i posti attivi.
        // I posti disattivati restano nel database, ma non devono comparire sulla mappa degli utenti.
        const posti = await PostoPrivato.find({ attivo: true })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            posti: posti.map((posto) => ({
                id: posto._id,
                hostId: posto.hostId,
                nome: posto.nome,
                descrizione: posto.descrizione,
                posizione: posto.posizione,
                tariffaOraria: posto.tariffaOraria,
                attivo: posto.attivo,
                disponibilita: posto.disponibilita,
                statoVerifica: posto.statoVerifica,
                createdAt: posto.createdAt,
                updatedAt: posto.updatedAt
            }))
        });
    } catch (error) {
        console.error('Errore durante il recupero dei posti privati:', error);

        return res.status(500).json({
            message: 'Errore interno durante il recupero dei posti privati.'
        });
    }
}

async function createPostoPrivato(req, res) {
    try {
        const {
            nome,
            descrizione,
            posizione,
            tariffaOraria,
            disponibilita,
            dichiarazioneProprietaAccettata
        } = req.body;

        const userId = req.user.userId;

        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({
                message: 'Il nome del posto auto è obbligatorio.'
            });
        }

        if (!posizione) {
            return res.status(400).json({
                message: 'La posizione del posto auto è obbligatoria.'
            });
        }

        const latitudine = normalizeNumber(posizione.latitudine);
        const longitudine = normalizeNumber(posizione.longitudine);
        const tariffa = normalizeNumber(tariffaOraria);

        if (!Number.isFinite(latitudine) || !Number.isFinite(longitudine)) {
            return res.status(400).json({
                message: 'Le coordinate del posto auto non sono valide.'
            });
        }

        if (!Number.isFinite(tariffa) || tariffa < 0) {
            return res.status(400).json({
                message: 'La tariffa oraria deve essere un numero maggiore o uguale a 0.'
            });
        }

        if (dichiarazioneProprietaAccettata !== true) {
            return res.status(400).json({
                message: 'Devi dichiarare di essere proprietario del posto auto o di avere l autorizzazione a pubblicarlo.'
            });
        }

        const nuovoPosto = await PostoPrivato.create({
            hostId: userId,
            nome,
            descrizione,
            posizione: {
                latitudine,
                longitudine,
                indirizzoTestuale: posizione.indirizzoTestuale || ''
            },
            tariffaOraria: tariffa,
            disponibilita: Array.isArray(disponibilita) ? disponibilita : [],
            dichiarazioneProprietaAccettata: true
        });

        // Quando un utente pubblica il primo posto auto, diventa HOST.
        // Non leggiamo mai il ruolo dal body della richiesta, perché sarebbe una falla di sicurezza.
        await Utente.findOneAndUpdate(
            { _id: userId, ruolo: 'UTENTE' },
            { ruolo: 'HOST' }
        );

        return res.status(201).json({
            message: 'Posto auto privato creato correttamente.',
            posto: buildPostoResponse(nuovoPosto)
        });
    } catch (error) {
        console.error('Errore durante la creazione del posto privato:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Dati del posto auto non validi.',
                errors: Object.values(error.errors).map((err) => err.message)
            });
        }

        return res.status(500).json({
            message: 'Errore interno durante la creazione del posto privato.'
        });
    }
}

module.exports = {
    listPostiPrivati,
    createPostoPrivato
};