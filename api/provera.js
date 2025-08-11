const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;            // noćni plan (standard)
const DAY_USE_PRICING_PLAN_ID = null;    // ako ima poseban plan za day-use, upiši ID; inače ostavi null
const apartmentMap = require("./apartmentMap");

const SITE_BASE = "https://www.apartmanizrenjanin.rs/";

// Konstante za dnevni termin
const DAY_USE_WINDOW = { start: "08:00", end: "18:00" };
const DAY_USE_FIXED_RSD = 2500;

// --- Kurs (NBS) ---
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
    return 117.5;
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
  if (!isValidDate(inDate) || !isValidDate(outDate)) throw new Error("Invalid time value");
  if (inDate.getTime() === outDate.getTime()) outDate.setDate(outDate.getDate() + 1);
  outDate.setDate(outDate.getDate() - 1);
  return outDate.toISOString().split("T")[0];
}

function minutesOf(t) {
  const [h, m] = (t || "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function makeBookingLink(baseUrl, { checkIn, checkOut, adults, children, dayUse, start, end }) {
  try {
    const u = new URL(baseUrl || SITE_BASE);
    u.searchParams.set("checkin", checkIn);
    u.searchParams.set("checkout", checkOut);
    u.searchParams.set("adults", String(adults));
    u.searchParams.set("children", String(children || 0));
    if (dayUse) {
      u.searchParams.set("dayuse", "1");
      if (start) u.searchParams.set("start", start);
      if (end) u.searchParams.set("end", end);
    }
    return u.toString();
  } catch {
    return SITE_BASE;
  }
}

module.exports = async (req, res) => {
  try {
    const { date_range, guests, day_use = false, time_range } = req.body;

    const checkIn = date_range?.[0];
    // Default checkOut: ako je day-use -> isti dan; inače sledeći dan
    let checkOut =
      day_use && date_range?.[0]
        ? date_range[0]
        : (date_range?.[1] ||
           new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0]);

    const adults = parseAdults(guests);
    const children = 0;

    if (!checkIn || !checkOut || !adults || isNaN(adults)) {
      return res.status(400).json({ message: "Molimo navedite ispravan period i broj osoba." });
    }

    // Validacija i priprema za day-use
    let startTime = null, endTime = null;
    let isDayUse = !!day_use;
    if (isDayUse) {
      if (!Array.isArray(time_range) || time_range.length !== 2) {
        return res.status(400).json({ message: "Za dnevno zakazivanje navedite time_range: [\"HH:MM\",\"HH:MM\"]." });
      }
      [startTime, endTime] = time_range;

      const startM = minutesOf(startTime);
      const endM = minutesOf(endTime);
      const windowStartM = minutesOf(DAY_USE_WINDOW.start);

      if (startM == null || endM == null) {
        return res.status(400).json({ message: "Neispravan format time_range. Primer: [\"08:00\",\"18:00\"]." });
      }

      // Ako start < 08:00 -> tretira se kao jedno noćenje
      if (startM < windowStartM) {
        isDayUse = false; // prebacujemo na noćenje
        // jedno noćenje: checkOut sledeći dan
        checkOut = new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0];
      }
    }

    const EUR_TO_RSD = await getEurToRsdRate();

    // Availability: ako je day-use ostaje isti dan; ako je noćenje -> ceo opseg
    const availDto = isDayUse ? checkIn : checkOut;
    const availabilityResponse = await axios.post(
      "https://app.otasync.me/api/avail/data/avail",
      { token: TOKEN, key: PKEY, id_properties: 322, dfrom: checkIn, dto: availDto },
      { headers: { "Content-Type": "application/json" } }
    );

    const availabilityData = availabilityResponse.data || {};
    const availableRoomTypes = Object.entries(availabilityData)
      .filter(([_, days]) => Object.values(days).every((val) => String(val) === "1"))
      .map(([roomTypeId]) => parseInt(roomTypeId));

    const availableOptions = [];
    const bookingLinkMap = {};

    for (const [key, apartment] of Object.entries(apartmentMap)) {
      if (!availableRoomTypes.includes(apartment.id_room_types)) continue;

      let totalRSD;

      if (isDayUse) {
        // 1) Ako je tačno 08:00–18:00 -> FIKSNO 2.500 RSD
        if (startTime === DAY_USE_WINDOW.start && endTime === DAY_USE_WINDOW.end) {
          totalRSD = DAY_USE_FIXED_RSD;
        } else if (DAY_USE_PRICING_PLAN_ID) {
          // 2) Ako imaš poseban plan za day-use, koristi ga
          const pricePayload = {
            token: TOKEN,
            key: PKEY,
            id_properties: apartment.id_properties,
            id_room_types: apartment.id_room_types,
            id_pricing_plans: DAY_USE_PRICING_PLAN_ID,
            dfrom: checkIn,
            dto: checkIn, // isti dan
            guests: { adults, children },
          };
          const priceResponse = await axios.post(
            "https://app.otasync.me/api/room/data/prices",
            pricePayload,
            { headers: { "Content-Type": "application/json" } }
          );
          const prices = priceResponse.data?.prices;
          const totalEUR = Object.values(prices || {}).reduce((s, v) => s + v, 0);
          totalRSD = Math.round(totalEUR * EUR_TO_RSD);
        } else {
          // 3) Fallback: pro-rata po satu iz noćne cene (24h baza)
          const pricePayload = {
            token: TOKEN,
            key: PKEY,
            id_properties: apartment.id_properties,
            id_room_types: apartment.id_room_types,
            id_pricing_plans: PRICING_PLAN_ID,
            dfrom: checkIn,
            dto: checkIn, // isti dan
            guests: { adults, children },
          };
          const priceResponse = await axios.post(
            "https://app.otasync.me/api/room/data/prices",
            pricePayload,
            { headers: { "Content-Type": "application/json" } }
          );
          const prices = priceResponse.data?.prices;
          const nightEUR = Object.values(prices || {}).reduce((s, v) => s + v, 0);
          const startM = minutesOf(startTime);
          const endM = minutesOf(endTime);
          let mins = endM - startM;
          if (mins <= 0) mins += 24 * 60;
          const hours = Math.max(1, mins / 60);
          const totalEUR = (nightEUR / 24) * hours;
          totalRSD = Math.round(totalEUR * EUR_TO_RSD);
        }
      } else {
        // Noćenje (standardno)
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
        const totalEUR = Object.values(prices || {}).reduce((s, v) => s + v, 0);
        totalRSD = Math.round(totalEUR * EUR_TO_RSD);
      }

      // Zaokruži nadole na 100
      const roundedRSD = Math.floor(totalRSD / 100) * 100;

      const baseLink = apartment.link || SITE_BASE;
      const booking_link = makeBookingLink(baseLink, {
        checkIn,
        checkOut,
        adults,
        children,
        dayUse: isDayUse,
        start: isDayUse ? startTime : null,
        end: isDayUse ? endTime : null
      });

      availableOptions.push({
        name: apartment.name,
        key,
        price: roundedRSD,
        image: apartment.image || null,
        link: booking_link,
      });

      bookingLinkMap[key] = booking_link;
    }

    if (availableOptions.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan za traženi termin.`,
        images: [],
        reprompt: true,
        reprompt_message: "Da li imate još pitanja?",
        set_variables: { booking_url: SITE_BASE }
      });
    }

    let headerMsg;
    if (isDayUse) {
      headerMsg = `✅ Dnevno zakazivanje za ${adults} osobe ${checkIn} (${startTime}–${endTime}):\n\n`;
    } else {
      headerMsg = `✅ Imamo slobodne apartmane za ${adults} osobe od ${checkIn} do ${checkOut}:\n\n`;
    }

    let responseMessage = headerMsg;
    availableOptions.forEach((opt, i) => {
      const priceFmt = Number(opt.price).toLocaleString("sr-RS");
      const line = `${i + 1}. ${opt.link ? `[${opt.name}](${opt.link})` : opt.name} – ${priceFmt} RSD\n`;
      responseMessage += line;
    });

    responseMessage += isDayUse
      ? `\n🔗 Za **dnevnu rezervaciju** kliknite na naziv željenog apartmana.\n`
      : `\n🔗 Za rezervaciju kliknite na naziv željenog apartmana iz liste iznad.\n`;

    responseMessage += `\n💡 *Podsećam Vas da ostvarujete 15% popusta za rezervaciju preko naše online platforme!* 😊✨\n`;

    return res.json({
      message: responseMessage,
      images: availableOptions.map((opt) => opt.image).filter(Boolean),
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?",
      set_variables: {
        available_options: JSON.stringify(availableOptions),
        booking_links: JSON.stringify(bookingLinkMap),
        booking_url: SITE_BASE,
        checkin_date: checkIn,
        checkout_date: checkOut,
        guests: adults.toString(),
        day_use: isDayUse,
        time_range: isDayUse ? JSON.stringify([startTime, endTime]) : null
      }
    });

  } catch (error) {
    console.error("Greška:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Došlo je do greške pri proveri. Pokušajte kasnije.",
      error: error.response?.data || error.message || error,
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?",
      set_variables: { booking_url: SITE_BASE }
    });
  }
};
