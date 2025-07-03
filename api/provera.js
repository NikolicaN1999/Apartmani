const axios = require("axios");

// Token
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";



// Mapa apartmana
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

module.exports = async (req, res) => {
  try {
    const { apartmentName, dateRange } = req.body;

    const apartment = apartmentMap[apartmentName?.toUpperCase()];
    if (!apartment) {
      return res.json({ message: `Nisam prepoznao apartman "${apartmentName}". Molim te proveri naziv.` });
    }

    const checkIn = dateRange?.[0];
    const checkOut = dateRange?.[1] || dateRange?.[0];

    if (!checkIn || !checkOut) {
      return res.json({ message: "Nedostaje period rezervacije. Molim te unesi datume." });
    }

    const response = await axios.post("https://app.otasync.me/api/engine/search", {
      id_property: apartment.id,
      date_from: checkIn,
      date_to: checkOut,
      lang: "sr",
      units: [apartment.name],
    }, {
      headers: {
        Authorization: `Bearer ${PKEY}`,
      },
    });

    const result = response.data?.data?.[0];

    if (!result) {
      return res.json({ message: `Nažalost, apartman ${apartment.name} nije dostupan u tom periodu.` });
    }
    const { apartment_name, date_range } = req.body;
    console.log("APARTMAN:", apartment_name);
    console.log("DATUMI:", date_range);

    const price = result.total_price_with_discount || result.total_price;

    return res.json({
      message: `✅ Apartman ${apartment.name} je dostupan od ${checkIn} do ${checkOut}.\n💶 Cena: ${price} EUR`
    });

  } catch (error) {
    console.error("Greška:", error);
    console.error("Detalji:", error.response?.data || error.message);
    return res.status(500).json({ message: "Greška pri proveri cene i dostupnosti. Pokušajte kasnije." });
  }
};
