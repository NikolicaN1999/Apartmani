const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;

const apartmentMap = {
  S1: { id_properties: 322, name: "STUDIO 1", id_room_types: 1339, id_rooms: "3234", room_number: "1", room_type: "STUDIO1" },
  S2: { id_properties: 322, name: "STUDIO 2", id_room_types: 1343, id_rooms: "3241", room_number: "1", room_type: "STUDIO2" },
  S3: { id_properties: 322, name: "STUDIO 3", id_room_types: 1345, id_rooms: "3244", room_number: "1", room_type: "STUDIO3" },
  S4: { id_properties: 322, name: "Studio 4", id_room_types: 23408, id_rooms: "58896", room_number: "1", room_type: "Studio4" },
  S13: { id_properties: 322, name: "SOBA 13", id_room_types: 1347, id_rooms: "3247", room_number: "1", room_type: "Soba13" },
  S14: { id_properties: 322, name: "SOBA 14", id_room_types: 1349, id_rooms: "3250", room_number: "1", room_type: "Soba14" },
  S15: { id_properties: 322, name: "STUDIO 15", id_room_types: 1353, id_rooms: "3257", room_number: "1", room_type: "STUDIO15" },
  S16: { id_properties: 322, name: "SOBA 16", id_room_types: 1363, id_rooms: "3273", room_number: "1", room_type: "SOBA16" },
  S17: { id_properties: 322, name: "STUDIO 17", id_room_types: 1355, id_rooms: "3260", room_number: "1", room_type: "STUDIO17" },
  S18: { id_properties: 322, name: "STUDIO 18", id_room_types: 1357, id_rooms: "3263", room_number: "1", room_type: "STUDIO18" },
  S19: { id_properties: 322, name: "APARTMAN 19", id_room_types: 1359, id_rooms: "3266", room_number: "1", room_type: "APARTMAN19" },
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
  if (!input) return null;
  const match = String(input).match(/\d+/);
  return match ? parseInt(match[0]) : null;
};

const calculateRealCheckOut = (checkIn, checkOut) => {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (inDate.getTime() === outDate.getTime()) {
    outDate.setDate(outDate.getDate() + 1);
  }
  outDate.setDate(outDate.getDate() - 1);
  return outDate.toISOString().split("T")[0];
};

module.exports = async (req, res) => {
  try {
    const { apartment_name, date_range, guests } = req.body;
    const normalizedInput = apartment_name?.trim().toLowerCase();

    if (!normalizedInput || !userInputMap[normalizedInput]) {
      return res.status(400).json({
        message: `Nažalost, ne prepoznajem naziv "${apartment_name}".`,
      });
    }

    const internalCode = userInputMap[normalizedInput];
    const apartment = apartmentMap[internalCode];
    const checkIn = date_range?.[0];
    const checkOut = date_range?.[1]
      ? date_range[1]
      : new Date(new Date(checkIn).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (!checkIn || !checkOut) {
      return res.status(400).json({ message: "Nedostaje period rezervacije." });
    }

    // 👇 Dodata provera broja osoba
    const adults = parseAdults(guests);
    const children = 0;

    if (!adults || isNaN(adults)) {
      return res.json({
        message: "Za koliko osoba želite da proverim dostupnost? 😊",
        reprompt: true
      });
    }

    const availabilityPayload = {
      token: TOKEN,
      key: PKEY,
      id_properties: apartment.id_properties,
      dfrom: checkIn,
      dto: checkOut,
      id_room_types: apartment.id_room_types,
      id_pricing_plans: PRICING_PLAN_ID
    };

    console.log("availabilityPayload", availabilityPayload);

    const availabilityResponse = await axios.post(
      "https://app.otasync.me/api/room/data/available_rooms",
      availabilityPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    const availabilityData = availabilityResponse.data;
    const rooms = availabilityData?.rooms || [];

    const isAvailable = rooms.some(room =>
      String(room.id_room_types) === String(apartment.id_room_types) &&
      room.name !== "(Overbooking)"
    );

    if (!isAvailable) {
      return res.json({
        message: `Nažalost, ${apartment.name} nije dostupan u celom traženom periodu.`,
      });
    }

    const dtoReal = calculateRealCheckOut(checkIn, checkOut);

    const pricePayload = {
      token: TOKEN,
      key: PKEY,
      id_properties: apartment.id_properties,
      id_room_types: apartment.id_room_types,
      id_pricing_plans: PRICING_PLAN_ID,
      dfrom: checkIn,
      dto: dtoReal,
      guests: { adults, children },
    };

    console.log("pricePayload", pricePayload);

    const priceResponse = await axios.post(
      "https://app.otasync.me/api/room/data/prices",
      pricePayload,
      { headers: { "Content-Type": "application/json" } }
    );

    const prices = priceResponse.data?.prices;

    if (!prices) {
      return res.status(500).json({ message: "Greška prilikom dobijanja cene." });
    }

    const total = Object.values(prices).reduce((sum, val) => sum + val, 0);

  return res.status(200).json({
  message: `✅ ${apartment.name} je dostupan od ${checkIn} do ${checkOut} za ${adults} osobe. Ukupna cena: ${total} €. Da li želite da rezervišemo? ✨`,
  "reprompt": true,
  set_variables: {
    selected_apartment: apartment.name,
    selected_checkin: checkIn,
    selected_checkout: checkOut,
    selected_guests: adults,
    calculated_price: total
  }
});


  } catch (error) {
    console.error("Greška:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Došlo je do greške pri proveri. Pokušajte kasnije.",
      error: error.response?.data || error.message || error,
    });
  }
};
