const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178; // noćni plan
const apartmentMap = require("./apartmentMap");

const SITE_BASE = "https://www.apartmanizrenjanin.rs/";

// Day-use prozor i fiksna cena
const DAY_USE_WINDOW = { start: "08:00", end: "18:00" };
const DAY_USE_FIXED_RSD = 2500;

// ================= Helpers =================
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
  const m = String(input).match(/\d+/);
  return m ? parseInt(m[0]) : null;
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

const pad2 = (n) => String(n).padStart(2, "0");
function minutesOf(t) {
  const [h, m] = String(t || "").split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}
function toISODate(y, m, d) {
  const dt = new Date(y, m - 1, d);
  return isValidDate(dt) ? dt.toISOString().split("T")[0] : null;
}

// skini datume iz teksta da ne pobrkaju regex za vreme
function stripDates(text = "") {
  return String(text).replace(/\b\d{1,2}[.\-\/]\d{1,2}(?:[.\-\/]\d{2,4})?\b/gi, " ");
}

// vreme iz teksta (nakon skidanja datuma); tražimo ':' ili 'h'
function extractTimeRangeFromText(text = "") {
  const cleaned = stripDates(text);
  if (!/[h:]/i.test(cleaned)) return null;
  const re =
    /(?:od\s*)?(\d{1,2})(?::?(\d{2}))?\s*(?:h|ч)?\s*(?:-|–|—|\bdo\b|до)\s*(\d{1,2})(?::?(\d{2}))?\s*(?:h|ч)?/i;
  const m = cleaned.match(re);
  if (!m) return null;
  const sh = pad2(Math.min(23, parseInt(m[1])));
  const sm = pad2(m[2] ? parseInt(m[2]) : 0);
  const eh = pad2(Math.min(23, parseInt(m[3])));
  const em = pad2(m[4] ? parseInt(m[4]) : 0);
  return [`${sh}:${sm}`, `${eh}:${em}`];
}

// datum iz teksta (danas/sutra/prekosutra ili 13.08[/2025])
function extractDateFromText(text = "") {
  const now = new Date();
  const lower = String(text).toLowerCase();
  if (/\bdanas\b/.test(lower)) return now.toISOString().split("T")[0];
  if (/\bsutra\b/.test(lower))
    return new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  if (/\bprekosutra\b/.test(lower))
    return new Date(now.getTime() + 2 * 86400000).toISOString().split("T")[0];
  const m = lower.match(/(\d{1,2})[.\-\/](\d{1,2})(?:[.\-\/](\d{2,4}))?/);
  if (!m) return null;
  const d = parseInt(m[1]),
    mo = parseInt(m[2]);
  let y = m[3] ? parseInt(m[3]) : now.getFullYear();
  if (y < 100) y += 2000;
  return toISODate(y, mo, d);
}

function toBool(val) {
  if (typeof val === "boolean") return val;
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (["true", "1", "da", "yes"].includes(s)) return true;
  if (["false", "0", "ne", "no", ""].includes(s)) return false;
  return null;
}

function buildLink(base) {
  return base || SITE_BASE;
}

// ================= MAIN =================
module.exports = async (req, res) => {
  try {
    const userText =
      req.body.text ||
      req.body.last_user_message ||
      req.body.message ||
      req.body.query ||
      "";

    // ---- vreme (sanitizuj prazne vrednosti) ----
    let time_range = null;
    if (Array.isArray(req.body.time_range)) {
      const t0 = String(req.body.time_range[0] || "").trim();
      const t1 = String(req.body.time_range[1] || "").trim();
      time_range = t0 === "" && t1 === "" ? null : [t0, t1];
    } else {
      time_range = extractTimeRangeFromText(userText);
    }

    // ---- day_use flag ----
    const dayUseFlag = toBool(req.body.day_use);
    // day-use je aktivan samo ako je eksplicitno true ILI imamo realno vreme
    let isDayUse =
      dayUseFlag === true ||
      (Array.isArray(time_range) && time_range.every((t) => /:|h/i.test(t) && t.trim() !== ""));

    // ---- datumi ----
    let checkIn = Array.isArray(req.body?.date_range)
      ? req.body.date_range[0]
      : req.body?.checkin_date || req.body?.date_range;

    let checkOut = Array.isArray(req.body?.date_range)
      ? req.body.date_range[1]
      : req.body?.checkout_date || undefined;

    if (!checkIn) {
      const fromText = extractDateFromText(userText);
      if (fromText) checkIn = fromText;
    }

    // ako nije day-use -> checkout je sledeći dan; ako jeste -> isti dan
    if (!checkOut) {
      checkOut = isDayUse && checkIn
        ? checkIn
        : checkIn
        ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0]
        : null;
    }

    // ---- gosti ----
    let adults = parseAdults(req.body.guests);
    if (!adults) adults = parseAdults(userText);
    const children = 0;

    // ---- bazna validacija (bez očekivanja vremena za non day-use) ----
    if (!checkIn) {
      return res.json({
        message:
          "Koji datum želite da proverimo? Pošaljite datum (npr. 2025-08-14) ili napišite *danas/sutra*.",
        reprompt: true,
        reprompt_message: "Molim vas, pošaljite datum. 😊",
      });
    }
    if (!adults) {
      return res.json({
        message: "Za koliko osoba želite da proverimo dostupnost?",
        reprompt: true,
        reprompt_message: "Koliko osoba dolazi? 🙂",
      });
    }

    // ---- day-use pravila ----
    let startTime = null,
      endTime = null,
      chargedAsNight = false;

    if (isDayUse) {
      if (!Array.isArray(time_range) || time_range.length !== 2) {
        // eksplicitno dnevno ali bez vremena -> zamoli za opseg
        return res.status(400).json({
          message: "Za dnevni termin pošaljite vremenski opseg, npr. 08:00–18:00.",
          reprompt: true,
          reprompt_message: "Koje vreme želite za dnevni termin?",
        });
      }
      [startTime, endTime] = time_range;
      const sM = minutesOf(startTime),
        eM = minutesOf(endTime);
      const winS = minutesOf(DAY_USE_WINDOW.start),
        winE = minutesOf(DAY_USE_WINDOW.end);

      if (sM == null || eM == null || sM >= eM) {
        return res.status(400).json({
          message: "Neispravan vremenski opseg. Primer: 08:00–18:00.",
          reprompt: true,
          reprompt_message: "Molim vas, pošaljite ispravno vreme (npr. 08:00–18:00).",
        });
      }
      // ako izlazi iz 08–18 -> naplata kao noćenje, ali datumi ostaju isti dan
      if (sM < winS || eM > winE) {
        chargedAsNight = true;
      }
    }

    // ---- availability ----
    // za day-use (čak i kad je chargedAsNight) proveravamo samo isti dan
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
        reprompt_message: "Da li imate još pitanja?",
      });
    }

    const EUR_TO_RSD = await getEurToRsdRate();

    // ---- cene & lista ----
    const availableOptions = [];
    for (const [key, apt] of Object.entries(apartmentMap)) {
      if (!availableRoomTypes.includes(apt.id_room_types)) continue;

      let totalRSD;

      if (isDayUse && !chargedAsNight) {
        // unutar 08–18 -> fiksno
        totalRSD = DAY_USE_FIXED_RSD;
      } else if (isDayUse && chargedAsNight) {
        // obračun kao jedno noćenje (1 noć), ali u poruci datumi ostaju isti dan
        const nextDayISO = new Date(new Date(checkIn).getTime() + 86400000)
          .toISOString()
          .split("T")[0];
        const dtoReal = calculateRealCheckOut(checkIn, nextDayISO);
        const pricePayload = {
          token: TOKEN,
          key: PKEY,
          id_properties: apt.id_properties,
          id_room_types: apt.id_room_types,
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
        // klasično noćenje
        const dtoReal = calculateRealCheckOut(checkIn, checkOut);
        const pricePayload = {
          token: TOKEN,
          key: PKEY,
          id_properties: apt.id_properties,
          id_room_types: apt.id_room_types,
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

      availableOptions.push({
        name: apt.name,
        key,
        price: roundedRSD,
        image: apt.image || null,
        link: buildLink(apt.link || null),
      });
    }

    if (availableOptions.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan za traženi termin.`,
        images: [],
        reprompt: true,
        reprompt_message: "Da li imate još pitanja?",
      });
    }

    // ---- poruka ----
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
      responseMessage += `\nℹ️ Dnevni termin unutar 08–18 naplaćuje se **fiksno ${DAY_USE_FIXED_RSD.toLocaleString(
        "sr-RS"
      )} RSD**.\n`;
    }

    responseMessage += isDayUse
      ? `\n🔗 Za **dnevni termin** odaberite željeni apartman iz liste.\n`
      : `\n🔗 Za rezervaciju kliknite na naziv željenog apartmana iz liste iznad.\n`;

    responseMessage += `\n💡 *Podsećam Vas da ostvarujete 15% popusta za rezervaciju preko naše online platforme!* 😊✨\n`;

    return res.json({
      message: responseMessage,
      images: availableOptions.map((o) => o.image).filter(Boolean),
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?",
      set_variables: {
        available_options: JSON.stringify(availableOptions),
        checkin_date: checkIn,
        checkout_date: isDayUse ? checkIn : checkOut,
        guests: adults.toString(),
        day_use: isDayUse,
        time_range: isDayUse
          ? JSON.stringify([
              time_range?.[0] || DAY_USE_WINDOW.start,
              time_range?.[1] || DAY_USE_WINDOW.end,
            ])
          : null,
        charged_as_night: !!chargedAsNight,
      },
    });
  } catch (error) {
    console.error("Greška:", error.response?.data || error.message || error);
    return res.status(500).json({
      message:
        "Došlo je do greške pri proveri. Pokušajte kasnije ili nam pišite na office@apartmanizrenjanin.rs.",
      error: error.response?.data || error.message || error,
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?",
    });
  }
};
