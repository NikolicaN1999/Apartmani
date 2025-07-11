const axios = require("axios");
const { v4: uuidv4 } = require("uuid"); // dodaj ovaj paket ako ga nemaš: npm install uuid
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

const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";

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
      key: uuidv4(),
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
