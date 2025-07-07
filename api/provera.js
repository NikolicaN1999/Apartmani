const axios = require("axios");

const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

const apartmentMap = {
  "S1": { id: 322, name: "STUDIO 1", unit_ids: 1339 },
  "S2": { id: 322, name: "STUDIO 2", unit_ids: 1343 },
  "S3": { id: 322, name: "STUDIO 3", unit_ids: 1341 },
  "S4": { id: 322, name: "Studio 4", unit_ids: 1342 },
  "S13": { id: 322, name: "SOBA 13", unit_ids: 1333 },
  "S14": { id: 322, name: "SOBA 14", unit_ids: 1344 },
  "S15": { id: 322, name: "STUDIO 15", unit_ids: 1345 },
  "S16": { id: 322, name: "SOBA 16", unit_ids: 1346 },
  "S17": { id: 322, name: "STUDIO 17", unit_ids: 1347 },
  "S18": { id: 322, name: "STUDIO 18", unit_ids: 1348 },
  "S19": { id: 322, name: "APARTMAN 19", unit_ids: 1359 },
};

module.exports = async (req, res) => {
  try {
    const { apartment_name, date_range } = req.body;
    const apartment = apartmentMap[apartment_name];

    if (!apartment) {
      return res.json({
        message: `Nisam prepoznao apartman "${apartment_name}". Molim te proveri naziv.`,
      });
    }

    const checkIn = date_range?.[0];
    const checkOut = date_range?.[1] || date_range?.[0];

    if (!checkIn || !checkOut) {
      return res.json({
        message: "Nedostaje period rezervacije. Molim te unesi datume.",
      });
    }

    const payload = {
      token: PKEY,
      key: PKEY,
      id_properties: apartment.id,
      dfrom: checkIn,
      dto: checkOut,
    };

    const response = await axios.post("https://app.otasync.me/api/avail/data/avail", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const availability = response.data?.[apartment.unit_ids];

    if (!availability) {
      return res.json({
        message: `Nažalost, nema podataka o dostupnosti za ${apartment.name}.`,
      });
    }

    const dates = Object.entries(availability);
    const unavailableDates = dates.filter(([_, value]) => value === "0");

    if (unavailableDates.length > 0) {
      return res.json({
        message: `Nažalost, ${apartment.name} nije dostupan u celom traženom periodu.`,
      });
    }

    return res.json({
      message: `✅ ${apartment.name} je dostupan od ${checkIn} do ${checkOut}.`,
    });

  } catch (error) {
    console.error("Greška:", error);
    return res.status(500).json({
      message: "Greška pri proveri dostupnosti. Pokušajte kasnije.",
    });
  }
};
