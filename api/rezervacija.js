const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

const apartmentMap = {
  "S1": { id_properties: 322, name: "STUDIO 1", id_room_types: 1339, id_rooms: "3234", room_number: "1", room_type: "STUDIO1" },
  "S2": { id_properties: 322, name: "STUDIO 2", id_room_types: 1343, id_rooms: "3241", room_number: "1", room_type: "STUDIO2" },
  "S3": { id_properties: 322, name: "STUDIO 3", id_room_types: 1345, id_rooms: "3244", room_number: "1", room_type: "STUDIO3" },
  "S4": { id_properties: 322, name: "Studio 4", id_room_types: 23408, id_rooms: "58896", room_number: "1", room_type: "Studio4" },
  "S13": { id_properties: 322, name: "SOBA 13", id_room_types: 1347, id_rooms: "3247", room_number: "1", room_type: "Soba13" },
  "S14": { id_properties: 322, name: "SOBA 14", id_room_types: 1349, id_rooms: "3250", room_number: "1", room_type: "Soba14" },
  "S15": { id_properties: 322, name: "STUDIO 15", id_room_types: 1353, id_rooms: "3257", room_number: "1", room_type: "STUDIO15" },
  "S16": { id_properties: 322, name: "SOBA 16", id_room_types: 1363, id_rooms: "3273", room_number: "1", room_type: "SOBA16" },
  "S17": { id_properties: 322, name: "STUDIO 17", id_room_types: 1355, id_rooms: "3260", room_number: "1", room_type: "STUDIO17" },
  "S18": { id_properties: 322, name: "STUDIO 18", id_room_types: 1357, id_rooms: "3263", room_number: "1", room_type: "STUDIO18" },
  "S19": { id_properties: 322, name: "APARTMAN 19", id_room_types: 1359, id_rooms: "3266", room_number: "1", room_type: "APARTMAN19" },
};

const userInputMap = {
  "deluks studio": "S1",
  "deluks dvokrevetni studio sa bračnim krevetom": "S2",
  "deluks studio 22m2": "S3",
  "deluks dvokrevetna soba sa bračnim krevetom": "S13",
  "deluks soba sa bračnim krevetom": "S14",
  "deluks soba 17m2": "S16",
  "deluks studio 17m2": "S17",
  "deluks studio 20m2": "S18",
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
