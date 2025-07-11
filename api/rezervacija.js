const axios = require("axios");
const apartmentMap = require("./apartmentMap");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

// Funkcija za generisanje noćenja (nights array)
function generateNights(startDate, endDate, price) {
  const nights = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const priceInt = parseInt(price);

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const formatted = d.toISOString().split("T")[0];
    nights.push({
      night_date: formatted,
      price: priceInt,
      original_price: priceInt,
      breakfast: 0,
      lunch: 0,
      dinner: 0
    });
  }

  return nights;
}

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

    const selected = apartmentMap[apartment_name];
    if (!selected) {
      return res.status(400).json({ message: "Nepoznat apartman." });
    }

    const payload = {
      key: PKEY,
      token: TOKEN,
      id_properties: 322,
      status: "1",
      reservation_type: "standard",
      date_arrival: checkin_date,
      date_departure: checkout_date,
      reference: "website-form",
      pricing_plan: "default",
      rooms: [
        {
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
          nights: generateNights(checkin_date, checkout_date, calculated_price)
        }
      ],
      guests: [
        {
          first_name,
          last_name,
          guest_type: "main"
        }
      ],
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
      message: `✅ Rezervacija za *${apartment_name}* od ${checkin_date} do ${checkout_date} za ${guests} osobe je uspešno evidentirana!\nUkupna cena: ${calculated_price} €.\n\n📧 Uskoro ćemo kontaktirati ${first_name} na ${email} ili ${phone} radi potvrde. Hvala vam! 😊`,
      clear_variables: true
    });

  } catch (error) {
    console.error("Greška pri rezervaciji:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Greška pri slanju rezervacije ka OTA Sync sistemu.",
    });
  }
};
