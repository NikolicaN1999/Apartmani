const axios = require("axios");
const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;

const apartmentMap = {
  "S1": { id_properties: 322, name: "STUDIO 1", id_room_types: 1339, id_rooms: "3234", room_number: "1", room_type: "STUDIO1" },
  "S2": { id_properties: 322, name: "STUDIO 2", id_room_types: 1343, id_rooms: "3241", room_number: "1", room_type: "STUDIO2" },
  "S3": { id_properties: 322, name: "STUDIO 3", id_room_types: 1345, id_rooms: "3244", room_number: "1", room_type: "STUDIO3" },
  "S13": { id_properties: 322, name: "SOBA 13", id_room_types: 1347, id_rooms: "3247", room_number: "1", room_type: "Soba13" },
  "S14": { id_properties: 322, name: "SOBA 14", id_room_types: 1349, id_rooms: "3250", room_number: "1", room_type: "Soba14" },
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
  "deluks apartman": "S19"
};

const parseAdults = (input) => {
  const match = String(input).match(/\d+/);
  return match ? parseInt(match[0]) : 2;
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

    const normalizedInput = apartment_name.trim().toLowerCase();
    const apartment_key = userInputMap[normalizedInput];
    if (!apartment_key) {
      return res.json({
        message: `Ne prepoznajem apartman "${apartment_name}". Molim vas pokušajte drugi opis.`
      });
    }

    const apartment = apartmentMap[apartment_key];
    const checkin_date = date_range?.[0];
    const checkout_date = date_range?.[1] || checkin_date;
    const adults = parseAdults(guests);
    const dtoReal = calculateRealCheckOut(checkin_date, checkout_date);

    if (!checkin_date || !checkout_date) {
      return res.json({
        message: "Nedostaje period rezervacije. Molim te unesi datume."
      });
    }

    // Provera dostupnosti
    const availabilityPayload = {
      token: TOKEN,
      key: PKEY,
      id_properties: apartment.id_properties,
      dfrom: checkin_date,
      dto: checkout_date
    };

    const availabilityRes = await axios.post(
      "https://app.otasync.me/api/room/data/available_rooms",
      availabilityPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    const availability = availabilityRes.data?.[apartment.id_room_types];
    if (!availability || Object.values(availability).includes("0")) {
      return res.json({
        message: `Nažalost, ${apartment.name} nije slobodan u odabranom periodu.`
      });
    }

    // Provera cene
    const pricePayload = {
      token: TOKEN,
      key: PKEY,
      id_properties: apartment.id_properties,
      id_room_types: apartment.id_room_types,
      id_pricing_plans: PRICING_PLAN_ID,
      dfrom: checkin_date,
      dto: dtoReal,
      guests: { adults, children: 0 }
    };

    const priceRes = await axios.post(
      "https://app.otasync.me/api/room/data/prices",
      pricePayload,
      { headers: { "Content-Type": "application/json" } }
    );

    const prices = priceRes.data?.prices || {};
    const total_price = Object.values(prices).reduce((sum, val) => sum + val, 0);

    return res.json({
      message: `✅ ${apartment.name} je slobodan od ${checkin_date} do ${checkout_date} za ${adults} osobe.\n\nUkupna cena boravka je ${total_price} €.\n\nŽelite li da nastavite sa rezervacijom? 😊`,
      set_variables: {
        apartment_key,
        checkin_date,
        checkout_date,
        guests: adults,
        calculated_price: total_price
      }
    });

  } catch (error) {
    console.error("Greška:", error?.response?.data || error);
    return res.status(500).json({
      message: "Došlo je do greške prilikom provere dostupnosti. Pokušajte ponovo kasnije."
    });
  }
};
