const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

const apartmentMap = {
  "S1": { id_properties: 322, name: "STUDIO 1", id_room_types: 1339, id_rooms: "3234", room_number: "1", room_type: "STUDIO1" },
  "S19": { id_properties: 322, name: "APARTMAN 19", id_room_types: 1359, id_rooms: "3266", room_number: "1", room_type: "APARTMAN19" },
};

const userInputMap = {
  "deluks studio": "S1",
  "deluks apartman": "S19",
};

const parseAdults = (input) => {
  const match = String(input).match(/\d+/);
  return match ? parseInt(match[0]) : 2;
};

module.exports = async (req, res) => {
  try {
    const { apartment_name, date_range, guests, first_name, last_name, email, phone } = req.body;

    const normalizedInput = apartment_name.trim().toLowerCase();
    const internalCode = userInputMap[normalizedInput];
    if (!internalCode) return res.json({ message: "Nepoznat apartman." });

    const apartment = apartmentMap[internalCode];
    const checkIn = date_range?.[0];
    const checkOut = date_range?.[1] || date_range?.[0];
    if (!checkIn || !checkOut) return res.json({ message: "Nedostaju datumi." });

    const reservationPayload = {
      token: TOKEN,
      key: PKEY,
      id_properties: apartment.id_properties,
      status: "confirmed",
      first_name,
      last_name,
      email,
      phone,
      dfrom: checkIn,
      dto: checkOut,
      rooms: [
        {
          id_room_types: apartment.id_room_types,
          id_rooms: apartment.id_rooms,
          room_type: apartment.room_type,
          room_number: apartment.room_number,
        },
      ],
    };

    const response = await axios.post(
      "https://app.otasync.me/api/bookings/create",
      reservationPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    return res.json({ message: `Rezervacija uspešno kreirana. Vidimo se u ${apartment.name}! 😊` });

  } catch (error) {
    console.error(error?.response?.data || error);
    return res.status(500).json({ message: "Došlo je do greške prilikom kreiranja rezervacije. Molimo pokušajte ponovo." });
  }
};
