const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const generateKey = () => uuidv4().replace(/-/g, "");
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const apartmentMap = require("./apartmentMap");

function generateNights(checkin, checkout, price) {
  const nights = [];
  const date1 = new Date(checkin);
  const date2 = new Date(checkout);

  while (date1 < date2) {
    nights.push({
      night_date: date1.toISOString().split("T")[0],
      price: parseInt(price),
      original_price: parseInt(price),
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    });
    date1.setDate(date1.getDate() + 1);
  }

  return nights;
}

module.exports = async (req, res) => {
  try {
    const {
      apartment_key,
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
      !apartment_key ||
      !checkin_date ||
      !checkout_date ||
      !guests ||
      !calculated_price ||
      !first_name ||
      !last_name ||
      !email ||
      !phone
    ) {
      return res.status(400).json({ message: "Nedostaju podaci za rezervaciju." });
    }

    const selected = apartmentMap[apartment_key];
    if (!selected) {
      return res.status(400).json({ message: "Nepoznat apartman." });
    }

    const payload = {
      key: generateKey(),
      id_properties: 322,
      token: TOKEN,
      status: "confirmed",
      reservation_type: "standard",
      reference: "website-form",
      pricing_plan: "default",
      date_arrival: checkin_date,
      date_departure: checkout_date,
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
          nights: generateNights(checkin_date, checkout_date, calculated_price),
        },
      ],
      guests: [
        {
          first_name,
          last_name,
          id_guests: 1,
          guest_type: "main",
        },
      ],
      guest_email: email,
      guest_app_type: "chatbot",
      send_email_to_guest: false,
      note: `Rezervacija sa sajta. Kontakt: ${phone}`,
    };

    console.log(">>> OTA Sync payload:", JSON.stringify(payload, null, 2));


    const response = await axios.post(
      "https://app.otasync.me/api/reservation/insert/reservation",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    return res.status(200).json({
      message: `✅ Rezervacija za *${selected.name}* od ${checkin_date} do ${checkout_date} za ${guests} osobe je uspešno evidentirana!\nUkupna cena: ${calculated_price} €.\n\n📧 Uskoro ćemo kontaktirati ${first_name} na ${email} ili ${phone} radi potvrde. Hvala vam! 😊`,
      clear_variables: true,
    });
  } catch (error) {
    console.error("Greška pri rezervaciji:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Greška pri slanju rezervacije ka OTA Sync sistemu.",
    });
  }
};
