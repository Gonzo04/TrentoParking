async function sendResetPasswordEmail(email, link) {
    const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');

    const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Messages: [{
                From: { Email: process.env.VERIFICA_EMAIL, Name: 'TrentoParking' },
                To: [{ Email: email }],
                Subject: 'Reset password TrentoParking',
                HTMLPart: `
                <div style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <tr>
                            <td align="center" style="padding: 40px 0; background-color: #003049;">
                                <h1 style="color: #ffffff; margin: 0;">TrentoParking</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 30px; text-align: center;">
                                <h1 style="color: #003049; font-size: 24px; margin: 0 0 20px 0;">Password dimenticata?</h1>
                                <p style="color: #555555; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
                                    Nessun problema, premi il pulsante sotto per procedere con il reset della tua password.
                                </p>
                                <table align="center" border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" bgcolor="#0077b6" style="border-radius: 8px;">
                                            <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold;">
                                                Cambia Password
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="color: #999999; font-size: 14px; margin: 30px 0 0 0;">
                                    Il link scadrà tra 1 ora. Se non hai richiesto tu questa modifica, puoi ignorare questa email.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px; background-color: #f9fbfb; text-align: center; border-top: 1px solid #eeeeee;">
                                <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
                                    &copy; 2026 TrentoParking - Via Belenzani, Trento
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>`
            }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.ErrorMessage || `Mailjet error ${response.status}`);
    }
}

module.exports = { sendResetPasswordEmail };
