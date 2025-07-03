const axios = require("axios");

const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

// ✅ Dodaj i `unit_id` za svaki apartman
const apartmentMap = {
  "S1": { id: 322, name: "STUDIO 1", unit_id: 1339 },
  "S2": { id: 322, name: "STUDIO 2", unit_ids: 1343 },
  "S3": { id: 322, name: "STUDIO 3", unit_ids: 1341 },
  "S4": { id: 322, name: "Studio 4", unit_ids: 1342 },
  "S13": { id: 322, name: "SOBA 13", unit_ids: 1333 },
  "S14": { id: 322, name: "SOBA 14", unit_ids: 1344 },
  "S15": { id: 322, name: "STUDIO 15", unit_ids: 1345 },
  "S16": { id: 322, name: "SOBA 16", unit_ids: 1346 },
  "S17": { id: 322, name: "STUDIO 17", unit_ids: 1347 },
  "S18": { id: 322, name: "STUDIO 18", unit_ids: 1348 },
  "S19": { id: 322, name: "APARTMAN 19", unit_ids: 1349 },
};

module.exports = async (req, res) => {
  try {
    console.log("Primljen body:", req.body);

    const { apartment_name, date_range } = req.body;

    console.log("apartment_name:", apartment_name);
    console.log("date_range:", date_range);

    const apartment = apartmentMap[apartment_name];

    if (!apartment) {
      console.log("Nepoznat apartman:", apartment_name);
      return res.json({
        message: `Nisam prepoznao apartman "${apartment_name}". Molim te proveri naziv.`
      });
    }

    const checkIn = date_range?.[0];
    const checkOut = date_range?.[1] || date_range?.[0];

    if (!checkIn || !checkOut) {
      return res.json({
        message: "Nedostaje period rezervacije. Molim te unesi datume."
      });
    }

    const payload = {
      id_property: apartment.id,
      date_from: checkIn,
      date_to: checkOut,
      lang: "sr",
      unit_ids: [apartment.unit_id]  // ✅ koristi unit_ids umesto units
    };

    console.log("Payload koji šaljemo:", payload);

    const response = await axios.post("https://app.otasync.me/api/engine/search", payload, {
      headers: {
        Authorization: `Bearer ${PKEY}`
      }
    });

    console.log("Odgovor stigao:", response.data);

    const result = response.data?.data?.[0];

    if (!result) {
      return res.json({
        message: `Nažalost, ${apartment.name} nije dostupan u tom periodu.`
      });
    }

    const price = result.total_price_with_discount || result.total_price;

    return res.json({
      message: `✅ ${apartment.name} je dostupan od ${checkIn} do ${checkOut}.\n💶 Cena: ${price} EUR`
    });

  } catch (error) {
    console.error("Greška:", error);
    console.error("Detalji:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Greška pri proveri cene i dostupnosti. Pokušajte kasnije."
    });
  }
};
