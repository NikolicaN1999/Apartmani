const axios = require("axios");

const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

const apartmentMap = {
  "S1": { id: 322, name: "STUDIO 1" },
  "S2": { id: 322, name: "STUDIO 2" },
  "S3": { id: 322, name: "STUDIO 3" },
  "S4": { id: 322, name: "Studio 4" },
  "S13": { id: 322, name: "SOBA 13" },
  "S14": { id: 322, name: "SOBA 14" },
  "S15": { id: 322, name: "STUDIO 15" },
  "S16": { id: 322, name: "SOBA 16" },
  "S17": { id: 322, name: "STUDIO 17" },
  "S18": { id: 322, name: "STUDIO 18" },
  "S19": { id: 322, name: "APARTMAN 19" },
};

module.exports = async (req, res) => {
  try {
    console.log("Primljen body:", req.body);

    const { apartment_name, date_range } = req.body;
    console.log(" apartment_name:",  apartment_name);
    console.log("date_range:", date_range);

    const apartment = apartmentMap[apartment_name?.toUpperCase()];
    if (!apartment) {
      console.log("Nepoznat apartman:", apartment_name);
      return res.json({ message: `Nisam prepoznao apartman "${apartment_name}". Molim te proveri naziv.` });
    }

    const checkIn = date_range?.[0];
    const checkOut = date_range?.[1] || date_range?.[0];
    console.log("checkIn:", checkIn);
    console.log("checkOut:", checkOut);

    if (!checkIn || !checkOut) {
      return res.json({ message: "Nedostaje period rezervacije. Molim te unesi datume." });
    }

    const payload = {
      id_property: apartment.id,
      date_from: checkIn,
      date_to: checkOut,
      lang: "sr",
      units: [apartment.name],
    };

    console.log("Payload koji šaljemo:", payload);

    const response = await axios.post("https://app.otasync.me/api/engine/search", payload, {
      headers: {
        Authorization: `Bearer ${PKEY}`,
      },
    });

    console.log("Odgovor stigao:", response.data);

    const result = response.data?.data?.[0];

    if (!result) {
      return res.json({ message: `Nažalost, apartman ${apartment.name} nije dostupan u tom periodu.` });
    }

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
