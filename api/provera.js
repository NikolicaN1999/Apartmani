const axios = require("axios");

const TOKEN = "32d64a0baa49df8334edb5394a1f76da746b66ba";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";
const PRICING_PLAN_ID = 1178;
const apartmentMap = require("./apartmentMap");

// Glavni sajt (fallback ako soba nema svoj link)
const SITE_BASE = "https://www.apartmanizrenjanin.rs/";

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

// Napravi URL ka konkretnoj sobi + dopuni parametrima upita
function makeBookingLink(baseUrl, { checkIn, checkOut, adults, children }) {
  try {
    const u = new URL(baseUrl || SITE_BASE);
    // standardni parametri (promeni nazive ako tvoj sajt koristi drugačije)
    u.searchParams.set("checkin", checkIn);
    u.searchParams.set("checkout", checkOut);
    u.searchParams.set("adults", String(adults));
    u.searchParams.set("children", String(children || 0));
    return u.toString();
  } catch {
    // ako baseUrl nije validan, vrati fallback
    return SITE_BASE;
  }
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
    const bookingLinkMap = {}; // mapiranje key -> booking link (za frontend)

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

      const totalRSD = Math.round(totalEUR * EUR_TO_RSD);
      const roundedRSD = Math.floor(totalRSD / 100) * 100;

      // iz apartmentMap očekujemo .link ka konkretnoj sobi (fallback je sajt)
      const baseLink = apartment.link || SITE_BASE;
      const booking_link = makeBookingLink(baseLink, { checkIn, checkOut, adults, children });

      availableOptions.push({
        name: apartment.name,
        key,
        price: roundedRSD,
        image: apartment.image || null,
        link: booking_link, // klik otvara REZERVACIJU za tu sobu i datume
      });

      bookingLinkMap[key] = booking_link;
    }

    if (availableOptions.length === 0) {
      return res.json({
        message: `Nažalost, nijedan apartman nije dostupan od ${checkIn} do ${checkOut}.`,
        images: [],
        reprompt: true,
        reprompt_message: "Da li imate još pitanja?",
        set_variables: {
          booking_url: SITE_BASE
        }
      });
    }

    let responseMessage = `✅ Imamo slobodne apartmane za ${adults} osobe od ${checkIn} do ${checkOut}:\n\n`;

    availableOptions.forEach((opt, i) => {
      const priceFmt = Number(opt.price).toLocaleString("sr-RS");
      // naziv vodi na tačnu sobu sa popunjenim datumima
      const line = `${i + 1}. ${opt.link ? `[${opt.name}](${opt.link})` : opt.name} – ${priceFmt} RSD\n`;
      responseMessage += line;
    });

    responseMessage += `\n🔗 Za rezervaciju kliknite na naziv željenog apartmana iz liste iznad.\n`;
    responseMessage += `\n💡 *Podsećam Vas da ostvarujete 15% popusta za rezervaciju preko naše online platforme!* 😊✨\n`;

    return res.json({
      message: responseMessage,
      images: availableOptions.map((opt) => opt.image).filter(Boolean),
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?",
      set_variables: {
        // kompletna lista sa linkovima (frontend može da otvori direktno)
        available_options: JSON.stringify(availableOptions),
        // mapiranje key -> link (korisno ako korisnik napiše samo “Studio 15”)
        booking_links: JSON.stringify(bookingLinkMap),
        booking_url: SITE_BASE,
        checkin_date: checkIn,
        checkout_date: checkOut,
        guests: adults.toString()
      }
    });

  } catch (error) {
    console.error("Greška:", error.response?.data || error.message || error);
    return res.status(500).json({
      message: "Došlo je do greške pri proveri. Pokušajte kasnije.",
      error: error.response?.data || error.message || error,
      reprompt: true,
      reprompt_message: "Da li imate još pitanja?",
      set_variables: {
        booking_url: SITE_BASE
      }
    });
  }
};
