const nodemailer = require('nodemailer');
const TokenVerifica = require('../models/TokenVerifica');
const Utente = require('../models/Utente');

const verificaEmail = async (email, link) => {
    try{
        let transporter = nodemailer.createTransport({
            service: "Gmail",
            auth:{
                user: process.env.VERIFICA_EMAIL,
                pass: process.env.VERIFICA_PASSWORD
            }
        });
        // Mandiamo la mail
        let contenuto = await transporter.sendMail({
            from: process.env.VERIFICA_EMAIL,
            to: email,
            subject: "Verifica il tuo account",
            html:`
            <div>
            <h3>Benvenuto su TrentoParking,</h3>
            <p>per confermare la tua e-mail <a href=${link}>premi qui</a></p>
            </div>
            `
        })
        console.log("mail mandata con successo");
    }catch(error){
        console.log(error, "Errore nell'invio della mail");
    }
}

const confermaMail = async (req, res) => {
    try {
        const tokenMail = await TokenVerifica.findOne({
            token: req.params.token,
        });
        if (!tokenMail) {
            return res.status(404).send("Token non valido");
        }
        await Utente.updateOne(
            { _id: tokenMail.userId },
            { $set: { emailVerificata: true } }
        );
        await TokenVerifica.findByIdAndDelete(tokenMail._id);

        return res.send("Email verificata");

    } catch (error) {
        console.log(error);
        return res.status(400).send("Si è verificato un errore");
    }
}

module.exports = {verificaEmail, confermaMail}