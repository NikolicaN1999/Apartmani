const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;            // noćni plan
const apartmentMap = require("./apartmentMap");

// Fiksna pravila za day-use
const DAY_USE_WINDOW = { start: "08:00", end: "18:00" };
const DAY_USE_FIXED_RSD = 2500;

// ===== Helpers =====
async function getEurToRsdRate() {
  try {
    const { data } = await axios.get("https://kurs.resenje.org/api/v1/currencies/eur/rates/today", { timeout: 5000 });
    const rate = data?.exchange_middle;
    if (typeof rate === "number" && rate > 0) return rate;

    const f = await axios.get("https://kurs.resenje.org/api/v1/currencies/eur/rates/future", { timeout: 5000 });
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
function isValidDate(d) { return d instanceof Date && !isNaN(d); }

function calculateRealCheckOut(checkIn, checkOut) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (!isValidDate(inDate) || !isValidDate(outDate)) throw new Error("Invalid time value");
  if (inDate.getTime() === outDate.getTime()) outDate.setDate(outDate.getDate() + 1);
  outDate.setDate(outDate.getDate() - 1);
  return outDate.toISOString().split("T")[0];
}

function pad2(n){ return String(n).padStart(2,"0"); }
function minutesOf(t){ const [h,m] = (t||"").split(":").map(Number); return Number.isNaN(h)?null:h*60+(Number.isNaN(m)?0:m); }
function toISODate(y,m,d){ const dt = new Date(y, m-1, d); return isValidDate(dt) ? dt.toISOString().split("T")[0] : null; }

function extractTimeRangeFromText(text=""){
  // hvata: 8-16, 08-16, 08:00-16:00, od 08h do 16h, 08 do 16, 08–16 ...
  const re = /(?:od\s*)?(\d{1,2})(?::?(\d{2}))?\s*(?:h|ч)?\s*(?:-|–|—|do|до)\s*(\d{1,2})(?::?(\d{2}))?\s*(?:h|ч)?/i;
  const m = String(text).match(re);
  if (!m) return null;
  const sh = pad2(Math.min(23, parseInt(m[1])));
  const sm = pad2(m[2]?parseInt(m[2]):0);
  const eh = pad2(Math.min(23, parseInt(m[3])));
  const em = pad2(m[4]?parseInt(m[4]):0);
  return [`${sh}:${sm}`, `${eh}:${em}`];
}

function extractDateFromText(text=""){
  const now = new Date();
  const todayISO = now.toISOString().split("T")[0];
  const lower = String(text).toLowerCase();

  if (/\bdanas\b/.test(lower)) return todayISO;
  if (/\bsutra\b/.test(lower)) {
    const d = new Date(now.getTime()+86400000);
    return d.toISOString().split("T")[0];
  }
  if (/\bprekosutra\b/.test(lower)) {
    const d = new Date(now.getTime()+2*86400000);
    return d.toISOString().split("T")[0];
  }

  // formati: 13.08., 13.08.2025, 13/8/25, 13-08-2025
  const re = /(\d{1,2})[.\-\/](\d{1,2})(?:[.\-\/](\d{2,4}))?/;
  const m = lower.match(re);
  if (!m) return null;
  const d = parseInt(m[1]), mo = parseInt(m[2]);
  let y = m[3] ? parseInt(m[3]) : now.getFullYear();
  if (y < 100) y += 2000;
  return toISODate(y, mo, d);
}

function buildLink(base){ return base || null; }

// robustna normalizacija booleana iz Chatbase (string/boolean/empty)
function toBool(val) {
  if (typeof val === "boolean") return val;
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "da" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "ne" || s === "no" || s === "") return false;
  return null; // nepoznato
}

// ====== MAIN ======
module.exports = async (req, res) => {
  try {
    // 1) Pre-parse iz teksta (ako platforma ne šalje structured polja)
    const userText = req.body.text || req.body.last_user_message || req.body.query || req.body.message || "";

    // a) vreme
    let time_range = Array.isArray(req.body.time_range) ? req.body.time_range : null;
    if (!time_range) time_range = extractTimeRangeFromText(userText);

    // b) day_use (string/boolean) -> bool ili null
    const dayUseFlag = toBool(req.body.day_use);

    // c) konačna odluka: day-use ako je eksplicitno true ILI ako imamo time_range
    let isDayUse = dayUseFlag === true || (!!time_range);

    // 2) Datumi
    let checkIn = Array.isArray(req.body?.date_range) ? req.body.date_range[0] : (req.body?.checkin_date || req.body?.date_range);
    let checkOut = Array.isArray(req.body?.date_range) ? req.body.date_range[1] : (req.body?.checkout_date || undefined);
    if (!checkIn) {
      const dateFromText = extractDateFromText(userText);
      if (dateFromText) checkIn = dateFromText;
    }
    // za day-use: isti dan ako nije zadat checkOut
    if (!checkOut) {
      checkOut = (isDayUse && checkIn)
        ? checkIn
        : (checkIn ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0] : null);
    }

    const adults = parseAdults(req.body.guests);
    const children = 0;
    if (!checkIn || !checkOut || !adults || isNaN(adults)) {
      return res.status(400).json({ message: "Molimo navedite ispravan period i broj osoba." });
    }

    // 3) Pravila za day-use (fiksno u okviru 08–18; inače naplata kao noćenje, ali isti dan)
    let startTime = null, endTime = null;
    let chargedAsNight = false;

    if (isDayUse) {
      // default opseg ako nije dat
      if (!Array.isArray(time_range) || time_range.length !== 2) {
        time_range = [DAY_USE_WINDOW.start, DAY_USE_WINDOW.end];
      }
      [startTime, endTime] = time_range;

      const startM = minutesOf(startTime);
      const endM   = minutesOf(endTime);
      const winS   = minutesOf(DAY_USE_WINDOW.start);
      const winE   = minutesOf(DAY_USE_WINDOW.end);

      if (startM == null || endM == null || startM >= endM) {
        return res.status(400).json({ message: "Neispravan vremenski opseg. Primer: 08:00–18:00." });
      }
      if (startM < winS || endM > winE) {
        chargedAsNight = true; // naplata kao noćenje, ali ne menjamo datume
      }
    }

    // 4) Availability — za day-use (pa i kad je chargedAsNight) gledamo samo taj dan
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

    // 5) Cene
    const availableOptions = [];
    for (const [key, apartment] of Object.entries(apartmentMap)) {
      if (!availableRoomTypes.includes(apartment.id_room_types)) continue;

      let totalRSD;
      if (isDayUse && !chargedAsNight) {
        // bilo koji termin unutar 08–18 => fiksno
        totalRSD = DAY_USE_FIXED_RSD;
      } else if (isDayUse && chargedAsNight) {
        // naplata kao jedno noćenje (računamo 1 noć), ali datumi u poruci ostaju isti dan
        const nextDayISO = new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0];
        const dtoReal = calculateRealCheckOut(checkIn, nextDayISO);
        const pricePayload = {
          token: TOKEN, key: PKEY,
          id_properties: apartment.id_properties,
          id_room_types: apartment.id_room_types,
          id_pricing_plans: PRICING_PLAN_ID,
          dfrom: checkIn, dto: dtoReal,
          guests: { adults, children }
        };
        const priceResponse = await axios.post("https://app.otasync.me/api/room/data/prices", pricePayload, { headers: { "Content-Type": "application/json" } });
        const prices = priceResponse.data?.prices;
        const totalEUR = Object.values(prices || {}).reduce((s, v) => s + v, 0);
        totalRSD = Math.round(totalEUR * (await getEurToRsdRate()));
      } else {
        // klasično noćenje
        const dtoReal = calculateRealCheckOut(checkIn, checkOut);
        const pricePayload = {
          token: TOKEN, key: PKEY,
          id_properties: apartment.id_properties,
          id_room_types: apartment.id_room_types,
          id_pricing_plans: PRICING_PLAN_ID,
          dfrom: checkIn, dto: dtoReal,
          guests: { adults, children }
        };
        const priceResponse = await axios.post("https://app.otasync.me/api/room/data/prices", pricePayload, { headers: { "Content-Type": "application/json" } });
        const prices = priceResponse.data?.prices;
        const totalEUR = Object.values(prices || {}).reduce((s, v) => s + v, 0);
        totalRSD = Math.round(totalEUR * EUR_TO_RSD);
      }

      const roundedRSD = Math.floor(totalRSD / 100) * 100;

      availableOptions.push({
        name: apartment.name,
        key,
        price: roundedRSD,
        image: apartment.image || null,
        link: buildLink(apartment.link || null)
      });
    }

    if (availableOptions.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan za traženi termin.`,
        images: [],
        reprompt: true,
        reprompt_message: "Da li imate još pitanja?"
      });
    }

    // 6) Poruka
    let headerMsg = isDayUse
      ? `✅ Dnevni termin za ${adults} osobe ${checkIn} (${(time_range?.[0] || DAY_USE_WINDOW.start)}–${(time_range?.[1] || DAY_USE_WINDOW.end)}):\n\n`
      : `✅ Imamo slobodne apartmane za ${adults} osobe od ${checkIn} do ${checkOut}:\n\n`;

    let responseMessage = headerMsg;
    availableOptions.forEach((opt, i) => {
      const priceFmt = Number(opt.price).toLocaleString("sr-RS");
      responseMessage += `${i + 1}. ${opt.link ? `[${opt.name}](${opt.link})` : opt.name} – ${priceFmt} RSD\n`;
    });

    if (isDayUse && chargedAsNight) {
      responseMessage += `\nℹ️ Pošto traženi termin izlazi iz prozora 08–18, **cena se obračunava kao jedno noćenje**, ali rezervacija važi **samo za navedeni dan** (dnevni boravak).\n`;
    } else if (isDayUse) {
      responseMessage += `\nℹ️ Dnevni termin unutar 08–18 se naplaćuje **fiksno ${DAY_USE_FIXED_RSD.toLocaleString("sr-RS")} RSD**.\n`;
    }

    responseMessage += isDayUse
      ? `\n🔗 Za **dnevni termin** odaberite željeni apartman iz liste.\n`
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
        checkout_date: isDayUse ? checkIn : checkOut, // za day-use ostaje isti dan
        guests: adults.toString(),
        day_use: isDayUse,
        time_range: isDayUse ? JSON.stringify([time_range?.[0] || DAY_USE_WINDOW.start, time_range?.[1] || DAY_USE_WINDOW.end]) : null,
        charged_as_night: chargedAsNight
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
