const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;
const apartmentMap = require("./apartmentMap");

// Helper za NBS kurs (Kurs API -> NBS podaci)
async function getEurToRsdRate() {
  try {
    const { data } = await axios.get(
      "https://kurs.resenje.org/api/v1/currencies/eur/rates/today",
      { timeout: 5000 }
    );
    const rate = data?.exchange_middle;
    if (typeof rate === "number" && rate > 0) return rate;

    const f = await axios.get(
      "https://kurs.resenje.org/api/v1/currencies/eur/rates/future",
      { timeout: 5000 }
    );
    if (typeof f.data?.rate === "number" && f.data.rate > 0) return f.data.rate;

    throw new Error("Kurs nije dostupan");
  } catch (e) {
    console.error("Greška pri čitanju kursa NBS:", e.message || e);
    return 117.5; // fallback
  }
}

function parseAdults(input) {
  if (!input) return null;
  const match = String(input).match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function calculateRealCheckOut(checkIn, checkOut) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (!isValidDate(inDate) || !isValidDate(outDate)) {
    throw new Error("Invalid time value");
  }
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
    const checkOut =
      date_range?.[1] ||
      new Date(new Date(checkIn).getTime() + 86400000)
        .toISOString()
        .split("T")[0];
    const adults = parseAdults(guests);
    const children = 0;

    if (!checkIn || !checkOut || !adults || isNaN(adults)) {
      return res
        .status(400)
        .json({ message: "Molimo navedite ispravan period i broj osoba." });
    }

    // Kurs u trenutku zahteva
    const EUR_TO_RSD = await getEurToRsdRate();

    const availabilityResponse = await axios.post(
      "https://app.otasync.me/api/avail/data/avail",
      { token: TOKEN, key: PKEY, id_properties: 322, dfrom: checkIn, dto: checkOut },
      { headers: { "Content-Type": "application/json" } }
    );

    const availabilityData = availabilityResponse.data || {};
    const availableRoomTypes = Object.entries(availabilityData)
      .filter(([_, days]) => Object.values(days).every((val) => String(val) === "1"))
      .map(([roomTypeId]) => parseInt(roomTypeId));

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
      const totalEUR = Object.values(prices || {}).reduce((sum, val) => sum + val, 0);

      // Konverzija u RSD i “lepo” zaokruživanje
      const totalRSD = Math.round(totalEUR * EUR_TO_RSD);
      const roundedRSD = Math.floor(totalRSD / 100) * 100;

      availableOptions.push({
        name: apartment.name,
        key,
        price: roundedRSD,
        image: apartment.image || null,
        link: apartment.link || null,
      });
    }

    if (availableOptions.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan od ${checkIn} do ${checkOut}.`,
        reprompt: false,
        suggested_replies: [],
        suggestions: [],
        cta: null,
        suppress_cta: true,
      });
    }

    let responseMessage = `✅ Imamo slobodne apartmane za ${adults} osobe od ${checkIn} do ${checkOut}:\n\n`;

    availableOptions.forEach((opt, i) => {
      const priceFmt = Number(opt.price).toLocaleString("sr-RS");
      const line = `${i + 1}. ${opt.link ? `[${opt.name}](${opt.link})` : opt.name} – ${priceFmt} RSD\n`;
      responseMessage += line;
    });

    responseMessage += `
\n💡 *Podsećam Vas da ostvarujete 15% popusta za rezervaciju preko naše online platforme!* 😊✨
`;

    return res.json({
      message: responseMessage,
      images: availableOptions.map((opt) => opt.image).filter(Boolean),
      reprompt: false,           // nema automatskog pitanja
      suggested_replies: [],     // nema quick replies
      suggestions: [],
      cta: null,
      suppress_cta: true,        // flag koji klijent može da poštuje
      set_variables: {
        // preimenovano da ne trigera rezervacijski tok
        available_options: JSON.stringify(availableOptions),
        checkin_date: checkIn,
        checkout_date: checkOut,
        guests: adults.toString(),
      },
    });
  } catch (error) {
    console.error("Greška:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Došlo je do greške pri proveri. Pokušajte kasnije.",
      error: error.response?.data || error.message || error,
      reprompt: false,
      suggested_replies: [],
      suggestions: [],
      cta: null,
      suppress_cta: true,
    });
  }
};
