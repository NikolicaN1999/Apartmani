const axios = require("axios");

// Koristiš pkey koji već imaš
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2";

// Priprema datuma
const checkIn = dateRange[0];
const checkOut = dateRange[1] || dateRange[0]; // ako korisnik unese samo jedan datum

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
    return res.json({ message: `Nažalost, apartman ${apartment.name} nije dostupan u tom periodu.` });
  }

  const price = result.total_price_with_discount || result.total_price;

  return res.json({
    message: `✅ Apartman ${apartment.name} je dostupan od ${checkIn} do ${checkOut}.\n💶 Cena: ${price} EUR`
  });

} catch (error) {
  console.error("Greška pri pozivu OTA Sync API-ja:", error.response?.data || error.message);
  return res.status(500).json({ message: "Greška pri proveri cene i dostupnosti." });
}
