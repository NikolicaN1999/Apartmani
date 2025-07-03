const axios = require("axios");

const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

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
    console.log("Primljen body:", req.body);

    const { apartmentName, dateRange } = req.body;
    console.log("apartmentName:", apartmentName);
    console.log("dateRange:", dateRange);

    const apartment = apartmentMap[apartmentName?.toUpperCase()];
    if (!apartment) {
      console.log("Nepoznat apartman:", apartmentName);
      return res.json({ message: `Nisam prepoznao apartman "${apartmentName}". Molim te proveri naziv.` });
    }

    const checkIn = dateRange?.[0];
    const checkOut = dateRange?.[1] || dateRange?.[0];
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
