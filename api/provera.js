const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;
const apartmentMap = require("./apartmentMap");

const SITE_BASE = "https://www.apartmanizrenjanin.rs/";

// Dnevni termin: prozor i fiksna cena
const DAY_USE_WINDOW = { start: "08:00", end: "18:00" };
const DAY_USE_FIXED_RSD = 2500;

// --- NBS kurs (za noćenje) ---
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

// --- Helperi ---
function parseAdults(input) {
  if (!input) return null;
  const match = String(input).match(/\d+/);
  return match ? parseInt(match[0]) : null;
}
function isValidDate(d) { return d instanceof Date && !isNaN(d); }
function calculateRealCheckOut(checkIn, checkOut) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (!isValidDate(inDate) || !isValidDate(outDate)) throw new Error("Invalid time value");
  if (inDate.getTime() === outDate.getTime()) outDate.setDate(outDate.getDate() + 1);
  outDate.setDate(outDate.getDate() - 1);
  return outDate.toISOString().split("T")[0];
}
function minutesOf(t) {
  const [h, m] = String(t || "").split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}
function pad2(n) { return String(n).padStart(2, "0"); }

function extractTimeRangeFromText(text = "") {
  const re = /(?:od\s*)?(\d{1,2})(?::?(\d{2}))?\s*(?:h|ч)?\s*(?:-|–|—|do|до)\s*(\d{1,2})(?::?(\d{2}))?\s*(?:h|ч)?/i;
  const m = String(text).match(re);
  if (!m) return null;
  const sh = pad2(Math.min(23, parseInt(m[1])));
  const sm = pad2(m[2] ? parseInt(m[2]) : 0);
  const eh = pad2(Math.min(23, parseInt(m[3])));
  const em = pad2(m[4] ? parseInt(m[4]) : 0);
  return [`${sh}:${sm}`, `${eh}:${em}`];
}
function extractDateFromText(text = "") {
  const now = new Date();
  const lower = String(text).toLowerCase();
  if (/\bdanas\b/.test(lower)) return now.toISOString().split("T")[0];
  if (/\bsutra\b/.test(lower)) return new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  if (/\bprekosutra\b/.test(lower)) return new Date(now.getTime() + 2 * 86400000).toISOString().split("T")[0];
  const re = /(\d{1,2})[.\-\/](\d{1,2})(?:[.\-\/](\d{2,4}))?/;
  const m = lower.match(re);
  if (!m) return null;
  const d = parseInt(m[1]), mo = parseInt(m[2]);
  let y = m[3] ? parseInt(m[3]) : now.getFullYear();
  if (y < 100) y += 2000;
  const dt = new Date(y, mo - 1, d);
  return isValidDate(dt) ? dt.toISOString().split("T")[0] : null;
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
    const userText = req.body.text || req.body.last_user_message || req.body.message || req.body.query || "";

    // Structured / NL fallback
    let day_use = req.body.day_use;
    let time_range = req.body.time_range || extractTimeRangeFromText(userText);

    // Datumi
    let checkIn = Array.isArray(req.body?.date_range) ? req.body.date_range[0] : req.body?.checkin_date || req.body?.date_range;
    let checkOut = Array.isArray(req.body?.date_range) ? req.body.date_range[1] : req.body?.checkout_date;
    if (!checkIn) checkIn = extractDateFromText(userText);

    // Za day-use, podrazumevaj isti dan ako checkout nije poslat
    if (!checkOut) {
      checkOut = (day_use && checkIn)
        ? checkIn
        : (checkIn ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0] : null);
    }

    const adults = parseAdults(req.body.guests);
    const children = 0;

    if (!checkIn || !checkOut || !adults || isNaN(adults)) {
      return res.status(400).json({ message: "Molimo navedite ispravan period i broj osoba." });
    }

    // --- Pravila za day-use ---
    let isDayUse = !!day_use || !!time_range;
    // Default vreme za day-use ako nije dato
    if (isDayUse && (!Array.isArray(time_range) || time_range.length !== 2)) {
      time_range = [DAY_USE_WINDOW.start, DAY_USE_WINDOW.end];
    }
    let startTime = isDayUse ? time_range[0] : null;
    let endTime   = isDayUse ? time_range[1] : null;

    // Da li izlazi iz prozora 08–18?
    let chargedAsNight = false;
    if (isDayUse) {
      const startM = minutesOf(startTime);
      const endM   = minutesOf(endTime);
      const winS   = minutesOf(DAY_USE_WINDOW.start);
      const winE   = minutesOf(DAY_USE_WINDOW.end);

      if (startM == null || endM == null || startM >= endM) {
        return res.status(400).json({ message: "Neispravan vremenski opseg. Primer: 08:00–18:00." });
      }
      // Ako termin izlazi iz prozora -> naplata kao noćenje, ali DATUMI OSTAJU ISTI DAN
      if (startM < winS || endM > winE) {
        chargedAsNight = true;
      }
    }

    // --- Availability ---
    // Za day-use uvek proveravamo isti dan (čak i kad naplaćujemo kao noćenje)
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

    if (availableRoomTypes.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan za traženi termin.`,
        reprompt: true,
        reprompt_message: "Da li imate još pitanja?"
      });
    }

    const EUR_TO_RSD = await getEurToRsdRate();

    // --- Izračun cena i lista ---
    const availableOptions = [];
    for (const [key, apartment] of Object.entries(apartmentMap)) {
      if (!availableRoomTypes.includes(apartment.id_room_types)) continue;

      let totalRSD;

      if (isDayUse && !chargedAsNight) {
        // BILO koji termin unutar 08–18 → fiksno 2.500
        totalRSD = DAY_USE_FIXED_RSD;
      } else if (isDayUse && chargedAsNight) {
        // Naplata kao jedno noćenje (za isti dan) – koristimo noćnu cenu 1 noći
        const nextDayISO = new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0];
        const dtoReal = calculateRealCheckOut(checkIn, nextDayISO);
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
      } else {
        // Klasično noćenje (koristi checkIn -> checkOut)
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

      const roundedRSD = Math.floor(totalRSD / 100) * 100;

      const booking_link = makeBookingLink(apartment.link || SITE_BASE, {
        checkIn,
        checkOut, // ostaje isti dan za day-use
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
    }

    if (availableOptions.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan za traženi termin.`,
        reprompt: true,
        reprompt_message: "Da li imate još pitanja?"
      });
    }

    // --- Poruka ---
    let headerMsg = isDayUse
      ? `✅ Dnevni termin za ${adults} osobe ${checkIn} (${time_range?.[0] || DAY_USE_WINDOW.start}–${time_range?.[1] || DAY_USE_WINDOW.end}):\n\n`
      : `✅ Imamo slobodne apartmane za ${adults} osobe od ${checkIn} do ${checkOut}:\n\n`;

    let responseMessage = headerMsg;
    availableOptions.forEach((opt, i) => {
      const priceFmt = Number(opt.price).toLocaleString("sr-RS");
      responseMessage += `${i + 1}. ${opt.link ? `[${opt.name}](${opt.link})` : opt.name} – ${priceFmt} RSD\n`;
    });

    if (isDayUse && chargedAsNight) {
      responseMessage += `\nℹ️ Pošto traženi dnevni termin počinje pre 08:00 (ili izlazi iz prozora 08–18), **cena se obračunava kao jedno noćenje**. Rezervacija važi **samo za dnevni boravak za navedeni datum**.\n`;
    }

    responseMessage += isDayUse
      ? `\n🔗 Za **dnevni termin** kliknite na naziv željenog apartmana.\n`
      : `\n🔗 Za rezervaciju kliknite na naziv željenog apartmana iz liste iznad.\n`;

    responseMessage += `\n💡 *Podsećam Vas da ostvarujete 15% popusta za rezervaciju preko naše online platforme!* 😊✨\n`;

    return res.json({
      message: responseMessage,
      images: availableOptions.map(opt => opt.image).filter(Boolean),
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?",
      set_variables: {
        available_options: JSON.stringify(availableOptions),
        checkin_date: checkIn,
        checkout_date: checkOut,        // i za day-use ostaje isti dan
        guests: adults.toString(),
        day_use: isDayUse,
        time_range: isDayUse ? JSON.stringify([time_range?.[0] || DAY_USE_WINDOW.start, time_range?.[1] || DAY_USE_WINDOW.end]) : null,
        charged_as_night: chargedAsNight // NOVO: frontend može da pokaže bedž/napomenu
      }
    });

  } catch (error) {
    console.error("Greška:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Došlo je do greške pri proveri. Pokušajte kasnije.",
      error: error.response?.data || error.message || error,
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?"
    });
  }
};
