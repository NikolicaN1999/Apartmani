const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;            // noćni plan (standard)
const apartmentMap = require("./apartmentMap");

const SITE_BASE = "https://www.apartmanizrenjanin.rs/";

// Day-use prozor i fiksna cena
const DAY_USE_WINDOW = { start: "08:00", end: "18:00" };
const DAY_USE_FIXED_RSD = 2500;

// ---------- Helpers ----------
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
function parseAdults(input) { if (!input) return null; const m = String(input).match(/\d+/); return m ? parseInt(m[0]) : null; }
function isValidDate(d) { return d instanceof Date && !isNaN(d); }
function calculateRealCheckOut(checkIn, checkOut) {
  const inDate = new Date(checkIn), outDate = new Date(checkOut);
  if (!isValidDate(inDate) || !isValidDate(outDate)) throw new Error("Invalid time value");
  if (inDate.getTime() === outDate.getTime()) outDate.setDate(outDate.getDate() + 1);
  outDate.setDate(outDate.getDate() - 1);
  return outDate.toISOString().split("T")[0];
}
const pad2 = n => String(n).padStart(2,"0");
function minutesOf(t){ const [h,m] = String(t||"").split(":").map(Number); if (Number.isNaN(h)) return null; return h*60 + (Number.isNaN(m)?0:m); }
function toISODate(y,m,d){ const dt = new Date(y, m-1, d); return isValidDate(dt) ? dt.toISOString().split("T")[0] : null; }

// 1) Ukloni datume (dd.mm(.yyyy), dd/mm, dd-mm) da regex za vreme ne “pojede” datume
function stripDates(text=""){
  return String(text).replace(/\b\d{1,2}[.\-\/]\d{1,2}(?:[.\-\/]\d{2,4})?\b/gi, " ");
}

// 2) Izvuci vreme iz teksta koji je očišćen od datuma
function extractTimeRangeFromText(text=""){
  const cleaned = stripDates(text);
  // Insistiramo na ':' ili 'h' – da izbegnemo lažne “08–16” datume bez oznake vremena
  if (!/[h:]/i.test(cleaned)) return null;
  const re = /(?:od\s*)?(\d{1,2})(?::?(\d{2}))?\s*(?:h|ч)?\s*(?:-|–|—|\bdo\b|до)\s*(\d{1,2})(?::?(\d{2}))?\s*(?:h|ч)?/i;
  const m = cleaned.match(re);
  if (!m) return null;
  const sh = pad2(Math.min(23, parseInt(m[1]))), sm = pad2(m[2]?parseInt(m[2]):0);
  const eh = pad2(Math.min(23, parseInt(m[3]))), em = pad2(m[4]?parseInt(m[4]):0);
  return [`${sh}:${sm}`, `${eh}:${em}`];
}

function extractDateFromText(text=""){
  const now = new Date();
  const todayISO = now.toISOString().split("T")[0];
  const lower = String(text).toLowerCase();
  if (/\bdanas\b/.test(lower)) return todayISO;
  if (/\bsutra\b/.test(lower)) return new Date(now.getTime()+86400000).toISOString().split("T")[0];
  if (/\bprekosutra\b/.test(lower)) return new Date(now.getTime()+2*86400000).toISOString().split("T")[0];
  const m = lower.match(/(\d{1,2})[.\-\/](\d{1,2})(?:[.\-\/](\d{2,4}))?/);
  if (!m) return null;
  const d = parseInt(m[1]), mo = parseInt(m[2]); let y = m[3] ? parseInt(m[3]) : now.getFullYear(); if (y < 100) y += 2000;
  return toISODate(y, mo, d);
}

function buildLink(base){ return base || SITE_BASE; }

// bool normalizacija (Chatbase često šalje "true"/"false" kao string)
function toBool(val) {
  if (typeof val === "boolean") return val;
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (["true","1","da","yes"].includes(s)) return true;
  if (["false","0","ne","no",""].includes(s)) return false;
  return null;
}

// ---------- MAIN ----------
module.exports = async (req, res) => {
  try {
    const userText = req.body.text || req.body.last_user_message || req.body.message || req.body.query || "";

    // vreme
    let time_range = Array.isArray(req.body.time_range) ? req.body.time_range : null;
    if (!time_range) time_range = extractTimeRangeFromText(userText);

    // day_use flag
    const dayUseFlag = toBool(req.body.day_use);
    // day-use je aktivan ako je eksplicitno true ILI ako smo zaista našli vreme u tekstu (posle uklanjanja datuma)
    let isDayUse = dayUseFlag === true || !!time_range;

    // datumi
    let checkIn = Array.isArray(req.body?.date_range) ? req.body.date_range[0] : (req.body?.checkin_date || req.body?.date_range);
    let checkOut = Array.isArray(req.body?.date_range) ? req.body.date_range[1] : (req.body?.checkout_date || undefined);
    if (!checkIn) {
      const fromText = extractDateFromText(userText);
      if (fromText) checkIn = fromText;
    }
    if (!checkOut) {
      checkOut = (isDayUse && checkIn) ? checkIn : (checkIn ? new Date(new Date(checkIn).getTime()+86400000).toISOString().split("T")[0] : null);
    }

    const adults = parseAdults(req.body.guests);
    const children = 0;
    if (!checkIn || !checkOut || !adults || isNaN(adults)) {
      return res.status(400).json({ message: "Molimo navedite ispravan period i broj osoba." });
    }

    // day-use pravila
    let startTime = null, endTime = null, chargedAsNight = false;
    if (isDayUse) {
      if (!Array.isArray(time_range) || time_range.length !== 2) {
        // ako nam je Chatbase uključio day_use bez vremena, tretiraj kao NE-day-use
        isDayUse = false;
      } else {
        [startTime, endTime] = time_range;
        const sM = minutesOf(startTime), eM = minutesOf(endTime);
        const winS = minutesOf(DAY_USE_WINDOW.start), winE = minutesOf(DAY_USE_WINDOW.end);
        if (sM == null || eM == null || sM >= eM) {
          isDayUse = false;
        } else if (sM < winS || eM > winE) {
          chargedAsNight = true; // naplata kao noćenje, ali ostaje isti dan
        }
      }
    }

    // Availability – za day-use (i chargedAsNight) gledamo samo taj dan
    const availDto = isDayUse ? checkIn : checkOut;
    const availabilityResponse = await axios.post(
      "https://app.otasync.me/api/avail/data/avail",
      { token: TOKEN, key: PKEY, id_properties: 322, dfrom: checkIn, dto: availDto },
      { headers: { "Content-Type": "application/json" } }
    );
    const availabilityData = availabilityResponse.data || {};
    const availableRoomTypes = Object.entries(availabilityData)
      .filter(([_, days]) => Object.values(days).every(v => String(v) === "1"))
      .map(([roomTypeId]) => parseInt(roomTypeId));

    if (availableRoomTypes.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan za traženi termin.`,
        reprompt: true,
        reprompt_message: "Da li imate još pitanja?"
      });
    }

    const EUR_TO_RSD = await getEurToRsdRate();

    const availableOptions = [];
    for (const [key, apt] of Object.entries(apartmentMap)) {
      if (!availableRoomTypes.includes(apt.id_room_types)) continue;

      let totalRSD;
      if (isDayUse && !chargedAsNight) {
        totalRSD = DAY_USE_FIXED_RSD;
      } else if (isDayUse && chargedAsNight) {
        // naplata kao jedno noćenje (računam 1 noć), ali poruka ostaje za isti dan
        const nextDayISO = new Date(new Date(checkIn).getTime()+86400000).toISOString().split("T")[0];
        const dtoReal = calculateRealCheckOut(checkIn, nextDayISO);
        const pricePayload = {
          token: TOKEN, key: PKEY,
          id_properties: apt.id_properties,
          id_room_types: apt.id_room_types,
          id_pricing_plans: PRICING_PLAN_ID,
          dfrom: checkIn, dto: dtoReal,
          guests: { adults, children }
        };
        const priceResponse = await axios.post("https://app.otasync.me/api/room/data/prices", pricePayload, { headers: { "Content-Type": "application/json" } });
        const prices = priceResponse.data?.prices;
        const totalEUR = Object.values(prices || {}).reduce((s,v)=>s+v,0);
        totalRSD = Math.round(totalEUR * EUR_TO_RSD);
      } else {
        // standardno noćenje
        const dtoReal = calculateRealCheckOut(checkIn, checkOut);
        const pricePayload = {
          token: TOKEN, key: PKEY,
          id_properties: apt.id_properties,
          id_room_types: apt.id_room_types,
          id_pricing_plans: PRICING_PLAN_ID,
          dfrom: checkIn, dto: dtoReal,
          guests: { adults, children }
        };
        const priceResponse = await axios.post("https://app.otasync.me/api/room/data/prices", pricePayload, { headers: { "Content-Type": "application/json" } });
        const prices = priceResponse.data?.prices;
        const totalEUR = Object.values(prices || {}).reduce((s,v)=>s+v,0);
        totalRSD = Math.round(totalEUR * EUR_TO_RSD);
      }

      const roundedRSD = Math.floor(totalRSD / 100) * 100;

      availableOptions.push({
        name: apt.name,
        key,
        price: roundedRSD,
        image: apt.image || null,
        link: buildLink(apt.link || null)
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

    // Poruka
    let headerMsg = isDayUse
      ? `✅ Dnevni termin za ${adults} osobe ${checkIn} (${(time_range?.[0] || DAY_USE_WINDOW.start)}–${(time_range?.[1] || DAY_USE_WINDOW.end)}):\n\n`
      : `✅ Imamo slobodne apartmane za ${adults} osobe od ${checkIn} do ${checkOut}:\n\n`;

    let responseMessage = headerMsg;
    availableOptions.forEach((opt, i) => {
      const priceFmt = Number(opt.price).toLocaleString("sr-RS");
      responseMessage += `${i + 1}. ${opt.link ? `[${opt.name}](${opt.link})` : opt.name} – ${priceFmt} RSD\n`;
    });

    if (isDayUse && chargedAsNight) {
      responseMessage += `\nℹ️ Traženi termin izlazi iz prozora 08–18, pa se **obračunava kao jedno noćenje**. Rezervacija i dalje važi **samo za navedeni dan** (dnevni boravak).\n`;
    } else if (isDayUse) {
      responseMessage += `\nℹ️ Dnevni termin unutar 08–18 naplaćuje se **fiksno ${DAY_USE_FIXED_RSD.toLocaleString("sr-RS")} RSD**.\n`;
    }

    responseMessage += isDayUse
      ? `\n🔗 Za **dnevni termin** odaberite željeni apartman iz liste.\n`
      : `\n🔗 Za rezervaciju kliknite na naziv željenog apartmana iz liste iznad.\n`;

    responseMessage += `\n💡 *Podsećam Vas da ostvarujete 15% popusta za rezervaciju preko naše online platforme!* 😊✨\n`;

    return res.json({
      message: responseMessage,
      images: availableOptions.map(o => o.image).filter(Boolean),
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?",
      set_variables: {
        available_options: JSON.stringify(availableOptions),
        checkin_date: checkIn,
        checkout_date: isDayUse ? checkIn : checkOut,
        guests: adults.toString(),
        day_use: isDayUse,
        time_range: isDayUse ? JSON.stringify([time_range?.[0] || DAY_USE_WINDOW.start, time_range?.[1] || DAY_USE_WINDOW.end]) : null,
        charged_as_night: !!chargedAsNight
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
