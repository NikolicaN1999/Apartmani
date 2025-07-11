const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const apartmentMap = require("./apartmentMap");

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

    if (!apartment_name || !checkin_date || !checkout_date || !guests || !calculated_price) {
      return res.status(400).json({ message: "Nedostaju podaci za rezervaciju." });
    }

    if (!first_name || !email || !phone) {
      return res.status(400).json({ message: "Nedostaju kontakt podaci." });
    }

    // 👉 Pronađi apartman po nazivu
    const selected = Object.values(apartmentMap).find(a => a.name === apartment_name);
    if (!selected) {
      return res.status(400).json({ message: "Nepoznat apartman." });
    }

    // 👉 Kreiraj nights array (samo prvi dan – možeš proširiti na više dana ako želiš)
    const nights = [{
      night_date: checkin_date,
      price: parseInt(calculated_price),
      original_price: parseInt(calculated_price),
      breakfast: 0,
      lunch: 0,
      dinner: 0
    }];

    const payload = {
      key: PKEY,
      token: TOKEN,
      id_properties: selected.id_properties,
      status: "1",
      rooms: [{
        id_room_types: selected.id_room_types,
        id_rooms: selected.id_rooms,
        room_type: selected.room_type,
        room_number: selected.room_number,
        avg_price: parseInt(calculated_price),
        total_price: parseInt(calculated_price),
        children_1: 0,
        children_2: 0,
        children_3: 0,
        adults: parseInt(guests),
        seniors: 0,
        nights: nights
      }],
      guests: [{
        first_name,
        last_name,
        guest_type: "main"
      }],
      guest_email: email,
      send_email_to_guest: 0,
      note: `Rezervacija sa sajta. Kontakt: ${phone}`
    };

    const response = await axios.post(
      "https://app.otasync.me/api/reservation/insert/reservation",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    return res.status(200).json({
      message: `✅ Rezervacija za *${apartment_name}* od ${checkin_date} do ${checkout_date} za ${guests} osobe je uspešno evidentirana!`,
      clear_variables: true
    });

  } catch (error) {
    console.error("Greška pri rezervaciji:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Greška pri slanju rezervacije ka OTA Sync sistemu.",
    });
  }
};
