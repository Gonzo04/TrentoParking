const nodemailer = require('nodemailer');

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

module.exports = {verificaEmail}