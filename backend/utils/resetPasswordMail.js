const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.VERIFICA_EMAIL,
    pass: process.env.VERIFICA_PASSWORD
  }
});

async function sendResetPasswordEmail(email, link) {

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset password ParkingShare',

    html: `
      <h2>Reset password</h2>

      <p>
        Hai richiesto il reset della password.
      </p>

      <a href="${link}">
        Clicca qui per reimpostare la password
      </a>
    `
  });
}

module.exports = { sendResetPasswordEmail };