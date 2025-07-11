const axios = require("axios");
const apartmentMap = require("./apartmentMap");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;

function generateNights(startDate, endDate, totalPrice) {
  const nights = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayCount = Math.round((end - start) / (1000 * 60 * 60 * 24));
  const pricePerNight = Math.round(totalPrice / dayCount);

  for (let i = 0; i < dayCount; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    nights.push({
      night_date: date.toISOString().split("T")[0],
      price: pricePerNight,
      original_price: pricePerNight,
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    });
  }

  return nights;
}

module.exports = async (req, res) => {
  try {
    const {
      apartment_key, // npr. "S18"
      checkin_date,
      checkout_date,
      guests,
      calculated_price,
      first_name,
      last_name,
      email,
      phone,
    } = req.body;

    if (
      !apartment_key || !checkin_date || !checkout_date ||
      !guests || !calculated_price || !first_name || !email || !phone
    ) {
      return res.status(400).json({ message: "Nedostaju podaci za rezervaciju." });
    }

    const selected = apartmentMap[apartment_key];
    if (!selected) {
      return res.status(400).json({ message: "Nepoznat apartman." });
    }

    const payload = {
      key: PKEY,
      token: TOKEN,
      id_properties: selected.id_properties,
      status: "1",
      reservation_type: "standard",
      date_arrival: checkin_date,
      date_departure: checkout_date,
      reference: "website-form",
      pricing_plan: "default",
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
        nights: generateNights(checkin_date, checkout_date, calculated_price),
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
      message: `✅ Rezervacija za *${selected.name}* od ${checkin_date} do ${checkout_date} za ${guests} osobe je uspešno evidentirana!\nUkupna cena: ${calculated_price} €.\n\n📧 Kontaktiraćemo vas na ${email} ili ${phone}.`,
      clear_variables: true
    });

  } catch (error) {
    console.error("Greška:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Greška pri slanju rezervacije ka OTA Sync sistemu.",
    });
  }
};
