const nodemailer = require('nodemailer');
const TokenVerifica = require('../models/TokenVerifica');
const Utente = require('../models/Utente');
const path = require('path');

const verificaEmail = async (email, link) => {
    // NON usiamo try/catch qui: vogliamo che un errore di invio
    // si propaghi al chiamante (authController) che esegue il rollback.
    // Ingoiare l'errore silenziosamente impedisce il rollback e lascia
    // utenti e token "fantasma" nel database.
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        socketOptions: { family: 4 },
        auth:{
            user: process.env.VERIFICA_EMAIL,
            pass: process.env.VERIFICA_PASSWORD
        }
    });

    await transporter.sendMail({
        from: process.env.VERIFICA_EMAIL,
        to: email,
        subject: "Verifica il tuo account",
        html:`
        <div>
            <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

            <tr>
                <td align="center" style="padding: 40px 0; background-color: #003049;">
                    <img src="cid:TrentoParkingLogo" alt="TrentoParking" width="600px" style="display: block; border: 0; width: 100%; max-width: 600px; height: auto;">
                </td>
            </tr>

            <tr>
                <td style="padding: 40px 30px; text-align: center;">
                    <h1 style="color: #003049; font-size: 24px; margin: 0 0 20px 0;">Benvenuto su TrentoParking!</h1>
                    <p style="color: #555555; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
                        Grazie per esserti registrato. Per completare la creazione del tuo account e iniziare a gestire i tuoi parcheggi, conferma il tuo indirizzo email cliccando sul pulsante qui sotto.
                    </p>

                <table align="center" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" bgcolor="#0077b6" style="border-radius: 8px;">
                            <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold;">
                                Conferma Email
                            </a>
                        </td>
                    </tr>
                </table>

                <p style="color: #999999; font-size: 14px; margin: 30px 0 0 0;">
                    Il link scadrà tra 24 ore. Se non hai richiesto tu questa registrazione, puoi ignorare questa email.
                </p>
            </td>
        </tr>

        <tr>
            <td style="padding: 30px; background-color: #f9fbfb; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
                    &copy; 2026 TrentoParking - Via Belenzani, Trento<br>
                <a href="#" style="color: #0077b6; text-decoration: none;">Termini e Condizioni</a> | <a href="#" style="color: #0077b6; text-decoration: none;">Privacy</a>
            </p>
            </td>
        </tr>
    </table>
</body>
`,
    attachments:[{
        filename: 'logoTrentoParkingMail.png',
        path: path.join(__dirname, '../../frontend/src/assets/logoTrentoParkingMail.png'),
        cid: 'TrentoParkingLogo'
    }]
    });

    console.log("mail mandata con successo a", email);
}

const confermaMail = async (req, res) => {
    try {
        const tokenMail = await TokenVerifica.findOne({
            token: req.params.token,
        });

        if (!tokenMail) {
            // Il token non esiste: scaduto (TTL 24h), già usato, o invalidato
            // da una nuova registrazione. Reindirizziamo al frontend con un
            // parametro di errore così l'utente vede un messaggio chiaro.
            return res.redirect(
                `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?verified=expired`
            );
        }

        await Utente.updateOne(
            { _id: tokenMail.userId },
            { $set: { emailVerificata: true } }
        );
        await TokenVerifica.findByIdAndDelete(tokenMail._id);

        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?verified=true`);

    } catch (error) {
        console.error('Errore conferma mail:', error);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?verified=error`);
    }
}

module.exports = {verificaEmail, confermaMail}