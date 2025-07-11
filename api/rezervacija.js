const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

module.exports = async (req, res) => {
  try {
    const {
      selected_apartment,
      selected_checkin,
      selected_checkout,
      selected_guests,
      calculated_price,
      contact_info // ako ubacimo ime, email i telefon
    } = req.body;

    if (!selected_apartment || !selected_checkin || !selected_checkout || !selected_guests) {
      return res.status(400).json({
        message: "Nedostaju podaci za rezervaciju. Molimo proverite prethodne korake.",
      });
    }

    const apartment = typeof selected_apartment === "string"
      ? JSON.parse(selected_apartment)
      : selected_apartment;

    // Opciono: provera kontakt podataka
    if (!contact_info || !contact_info.name || !contact_info.email || !contact_info.phone) {
      return res.status(400).json({
        message: "Nedostaju kontakt podaci. Molimo unesite ime, email i broj telefona.",
      });
    }

    // 👉 Ovde možeš slati podatke API-ju, emailu, bazi...

    return res.status(200).json({
      message: `✅ Rezervacija za *${apartment.name}* od ${selected_checkin} do ${selected_checkout} za ${selected_guests} osobe je uspešno evidentirana!\nUkupna cena: ${calculated_price} €.\n\n📧 Uskoro ćemo kontaktirati ${contact_info.name} na ${contact_info.email} ili ${contact_info.phone} radi potvrde. Hvala vam! 😊`,
      clear_variables: true
    });

  } catch (error) {
    console.error("Greška:", error);
    return res.status(500).json({
      message: "Došlo je do greške pri obradi rezervacije. Pokušajte ponovo.",
    });
  }
};
