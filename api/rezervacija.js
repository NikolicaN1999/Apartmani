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
      calculated_price
    } = req.body;

    if (!selected_apartment || !selected_checkin || !selected_checkout || !selected_guests) {
      return res.status(400).json({
        message: "Nedostaju podaci za rezervaciju. Molimo proverite korake unazad.",
      });
    }

    // 👉 Ovde možeš dodati upis rezervacije u bazu, email obaveštenje, ili API poziv svom sistemu

    return res.status(200).json({
      message: `📩 Rezervacija za ${selected_apartment} od ${selected_checkin} do ${selected_checkout} za ${selected_guests} osobe je evidentirana! Ukupna cena: ${calculated_price} €. Uskoro ćemo vas kontaktirati radi potvrde. Hvala vam! 😊`
    });

  } catch (error) {
    console.error("Greška:", error);
    return res.status(500).json({
      message: "Došlo je do greške pri obradi rezervacije. Pokušajte ponovo.",
    });
  }
};
