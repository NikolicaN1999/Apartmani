const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;

const apartmentMap = {
  S1: {
    id_properties: 322,
    name: "STUDIO 1",
    id_room_types: 1339,
    id_rooms: "3234",
    room_number: "1",
    room_type: "STUDIO1",
    link: "https://www.apartmanizrenjanin.rs/studio-1-apartmani-zrenjanin/?_gl=1*1lynb0n*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S2: {
    id_properties: 322,
    name: "STUDIO 2",
    id_room_types: 1343,
    id_rooms: "3241",
    room_number: "1",
    room_type: "STUDIO2",
    link: "https://www.apartmanizrenjanin.rs/studio-2-apartmani-zrenjanin/?_gl=1*1y463j*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S3: {
    id_properties: 322,
    name: "STUDIO 3",
    id_room_types: 1345,
    id_rooms: "3244",
    room_number: "1",
    room_type: "STUDIO3",
    link: "https://www.apartmanizrenjanin.rs/studio-3-apartmani-zrenjanin/?_gl=1*1y463j*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S4: {
    id_properties: 322,
    name: "Studio 4",
    id_room_types: 23408,
    id_rooms: "58896",
    room_number: "1",
    room_type: "Studio4",
    link: "https://www.apartmanizrenjanin.rs/studio-4-apartmani-zrenjanin/?_gl=1*1g7545g*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S13: {
    id_properties: 322,
    name: "SOBA 13",
    id_room_types: 1347,
    id_rooms: "3247",
    room_number: "1",
    room_type: "Soba13",
    link: "https://www.apartmanizrenjanin.rs/soba-13-apartmani-zrenjanin/?_gl=1*14x3kg9*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S14: {
    id_properties: 322,
    name: "SOBA 14",
    id_room_types: 1349,
    id_rooms: "3250",
    room_number: "1",
    room_type: "Soba14",
    link: "https://www.apartmanizrenjanin.rs/soba-14-apartmani-zrenjanin/?_gl=1*1g7545g*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY",
  },
  S15: {
    id_properties: 322,
    name: "STUDIO 15",
    id_room_types: 1353,
    id_rooms: "3257",
    room_number: "1",
    room_type: "STUDIO15",
    link: "https://www.apartmanizrenjanin.rs/studio-15-apartmani-zrenjanin/?_gl=1*1g7545g*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S16: {
    id_properties: 322,
    name: "SOBA 16",
    id_room_types: 1363,
    id_rooms: "3273",
    room_number: "1",
    room_type: "SOBA16",
    link: "https://www.apartmanizrenjanin.rs/soba-16-apartmani-zrenjanin/?_gl=1*twe9ek*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S17: {
    id_properties: 322,
    name: "STUDIO 17",
    id_room_types: 1355,
    id_rooms: "3260",
    room_number: "1",
    room_type: "STUDIO17",
    link: "https://www.apartmanizrenjanin.rs/studio-17-apartmani-zrenjanin/?_gl=1*twe9ek*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S18: {
    id_properties: 322,
    name: "STUDIO 18",
    id_room_types: 1357,
    id_rooms: "3263",
    room_number: "1",
    room_type: "STUDIO18",
    link: "https://www.apartmanizrenjanin.rs/studio-18-apartmani-zrenjanin/?_gl=1*1jnj73p*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"
  },
  S19: {
    id_properties: 322,
    name: "APARTMAN 19",
    id_room_types: 1359,
    id_rooms: "3266",
    room_number: "1",
    room_type: "APARTMAN19",
    image: "https://www.apartmanizrenjanin.rs/wp-content/uploads/revslider/apartman-19/APARTMAN19-1-apartmani-zrenjanin.jpg.webp",
    link: "https://www.apartmanizrenjanin.rs/apartman-19/?_gl=1*86c4ox*_up*MQ..*_gs*MQ..&gclid=CjwKCAjw7MLDBhAuEiwAIeXGITgzk-JVY3VjOtePb3hXGs-dJAIkafHgVwf48UN5a-f9ecfk0H42OhoCOMsQAvD_BwE&gbraid=0AAAAADSMoNgn6MTIMA5BJ4NFSrFoBhKdY"

  }
};

function parseAdults(input) {
  if (!input) return null;
  const match = String(input).match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function calculateRealCheckOut(checkIn, checkOut) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (inDate.getTime() === outDate.getTime()) {
    outDate.setDate(outDate.getDate() + 1);
  }
  outDate.setDate(outDate.getDate() - 1);
  return outDate.toISOString().split("T")[0];
}

module.exports = async (req, res) => {
  try {
    const { date_range, guests } = req.body;
    const checkIn = date_range?.[0];
    const checkOut = date_range?.[1]
      ? date_range[1]
      : new Date(new Date(checkIn).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const adults = parseAdults(guests);
    const children = 0;

    if (!checkIn || !checkOut || !adults || isNaN(adults)) {
      return res.status(400).json({ message: "Molimo navedite ispravan period i broj osoba." });
    }

    // 1. Dohvatanje dostupnosti
    const availabilityResponse = await axios.post(
      "https://app.otasync.me/api/avail/data/avail",
      {
        token: TOKEN,
        key: PKEY,
        id_properties: 322,
        dfrom: checkIn,
        dto: checkOut,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const availabilityData = availabilityResponse.data || {};
    const availableRoomTypes = [];

    for (const [roomTypeId, days] of Object.entries(availabilityData)) {
      const isFullyAvailable = Object.values(days).every(val => String(val) === "1");
      if (isFullyAvailable) {
        availableRoomTypes.push(parseInt(roomTypeId));
      }
    }

    // 2. Provera cena + slike + link
    const availableOptions = [];

    for (const [key, apartment] of Object.entries(apartmentMap)) {
      if (!availableRoomTypes.includes(apartment.id_room_types)) continue;

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

      const priceResponse = await axios.post(
        "https://app.otasync.me/api/room/data/prices",
        pricePayload,
        { headers: { "Content-Type": "application/json" } }
      );

      const prices = priceResponse.data?.prices;
      const total = Object.values(prices || {}).reduce((sum, val) => sum + val, 0);

      availableOptions.push({
        name: apartment.name,
        key,
        price: total,
        image: apartment.image || null,
        link: apartment.link || null
      });
    }

    if (availableOptions.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan od ${checkIn} do ${checkOut}.`
      });
    }

    let message = `✅ Imamo slobodne apartmane za ${adults} osobe od ${checkIn} do ${checkOut}:\n\n`;

    availableOptions.forEach((opt, i) => {
      const line = `${i + 1}. ${opt.link ? `[${opt.name}](${opt.link})` : opt.name} – ${opt.price} €\n`;
      message += line;
    });

    message += `\nMolim vas napišite broj ili naziv apartmana koji želite da rezervišete. 😊`;

    return res.json({
      message,
      images: availableOptions.map(opt => opt.image).filter(Boolean),
      reprompt: true,
      set_variables: {
        available_apartments: JSON.stringify(availableOptions),
        checkin_date: checkIn,
        checkout_date: checkOut,
        guests: adults.toString(),
        next_action: "Izbor apartmana"
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
