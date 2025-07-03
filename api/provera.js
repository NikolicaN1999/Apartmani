const axios = require("axios");

// ✅ 1. Tvoj OTA Sync API ključ
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

// ✅ 2. Mapa apartmana (oznaka -> OTA property ID)
const apartmentMap = {
  "S1": { id: 322, name: "S1" },
  "S2": { id: 322, name: "S2" },
  "S3": { id: 322, name: "S3" },
  "STUD4": { id: 322, name: "STUD4" },
  "S13": { id: 322, name: "S13" },
  "S14": { id: 322, name: "S14" },
  "S15": { id: 322, name: "S15" },
  "S16": { id: 322, name: "S16" },
  "S17": { id: 322, name: "S17" },
  "S18": { id: 322, name: "S18" },
  "S19": { id: 322, name: "S19" },
};

// ✅ 3. Glavna funkcija koju poziva Chatbase
module.exports = async (req, res) => {
  const message = req.body.message || "";
  const dateRange = req.body.date_range;

  // ✅ 4. Provera da li je naveden apartman
  const foundKey = Object.keys(apartmentMap).find(key =>
    message.toLowerCase().includes(key.toLowerCase())
  );

  if (!foundKey) {
    return res.json({
      message: "🔎 Molimo vas da napišete oznaku apartmana, npr. S1, STUD4 ili S15."
    });
  }

  const apartment = apartmentMap[foundKey];

  // ✅ 5. Provera datuma
  if (!dateRange || dateRange.length === 0) {
    return res.json({
      message: "📅 Molimo vas da napišete datum ili period boravka."
    });
  }

  const checkIn = dateRange[0];
  const checkOut = dateRange[1] || dateRange[0]; // ako je unet samo jedan dan

  // ✅ 6. Poziv OTA Sync API-ja
  try {
    const response = await axios.post("https://app.otasync.me/api/engine/search", {
      id_property: apartment.id,
      date_from: checkIn,
      date_to: checkOut,
      lang: "sr"
    }, {
      headers: {
        Authorization: `Bearer ${PKEY}`,
      },
    });

    const result = response.data?.data?.[0];

    if (!result) {
      return res.json({
        message: `❌ Nažalost, apartman ${apartment.name} nije dostupan od ${checkIn} do ${checkOut}.`
      });
    }
    if (!dateRange || dateRange.length === 0) {
  return res.json({
    message: `📅 Da bih proverio dostupnost za apartman ${apartment.name}, molim te napiši i datum boravka, npr. "S1 od 12. do 14. jula".`
    });
    }


    const price = result.total_price_with_discount || result.total_price;

    return res.json({
      message: `✅ Apartman ${apartment.name} je dostupan od ${checkIn} do ${checkOut}.\n💶 Cena: ${price} EUR`
    });

  } catch (error) {
    console.error("Greška pri pozivu OTA Sync API-ja:", error.response?.data || error.message);
    return res.status(500).json({
      message: "⚠️ Došlo je do greške prilikom provere dostupnosti. Pokušajte ponovo kasnije."
    });
  }
};
