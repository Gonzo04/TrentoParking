const Utente = require('../models/Utente');
const TokenVerifica = require('../models/TokenVerifica');

async function pulisciUserNonVerificati() {
  try {

    const limitDate = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const usersToDelete = await Utente.find({
      emailVerificata: false,
      createdAt: { $lt: limitDate }
    });

    for (const user of usersToDelete) {

      await TokenVerifica.deleteMany({
        userId: user._id
      });

      await Utente.findByIdAndDelete(user._id);

      console.log(
        `Utente eliminato: ${user.email}`
      );
    }

  } catch (error) {
    console.error(error);
  }
}

module.exports = pulisciUserNonVerificati;