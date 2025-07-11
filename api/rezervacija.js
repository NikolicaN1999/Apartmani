const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

module.exports = async (req, res) => {
  try {
  const {
  apartment_name,
  checkin_date,
  checkout_date,
  guests,
  calculated_price,
  first_name,
  last_name,
  email,
  phone
} = req.body;

if (!apartment_name || !checkin_date || !checkout_date || !guests) {
  return res.status(400).json({
    message: "Nedostaju podaci za rezervaciju. Molimo proverite prethodne korake.",
  });
}

if (!first_name || !email || !phone) {
  return res.status(400).json({
    message: "Nedostaju kontakt podaci. Molimo unesite ime, email i broj telefona.",
  });
}


    // 👉 Ovde možeš slati podatke API-ju, emailu, bazi...

    return res.status(200).json({
      message: `✅ Rezervacija za *${apartment_name}* od ${checkin_date} do ${checkout_date} za ${guests} osobe je uspešno evidentirana!\nUkupna cena: ${calculated_price} €.\n\n📧 Uskoro ćemo kontaktirati ${first_name} na ${email} ili ${phone} radi potvrde. Hvala vam! 😊`,

      clear_variables: true
    });

  } catch (error) {
    console.error("Greška:", error);
    return res.status(500).json({
      message: "Došlo je do greške pri obradi rezervacije. Pokušajte ponovo.",
    });
  }
};
