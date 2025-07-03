const axios = require("axios");

const AVAILABILITY_URL = "https://app.otasync.me/api/calendar/getAvailability";
const PRICES_URL = "https://app.otasync.me/api/calendar/getPrices";
const PKEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2"; // zameni tvojim stvarnim pkey-em

module.exports = async (req, res) => {
  try {
    const propertyId = req.query.id || req.body?.id;
    if (!propertyId) {
      return res.status(400).json({ message: "ID apartmana nije prosleđen." });
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];

    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() + 180);
    const endDate = endDateObj.toISOString().split('T')[0];

    // 👁️ 1. Provera dostupnosti
    const availabilityResponse = await axios.post(
      AVAILABILITY_URL,
      {
        id_properties: propertyId,
        start: startDate,
        end: endDate,
      },
      {
        headers: {
          "Content-Type": "application/json",
          pkey: PKEY,
        },
      }
    );

    const availableDays = availabilityResponse.data.filter(d => d.available > 0);

    if (availableDays.length === 0) {
      return res.json({ message: "Nažalost, nema slobodnih termina u narednih 180 dana." });
    }

    // 📊 2. Provera cena
    const pricesResponse = await axios.post(
      PRICES_URL,
      {
        id_properties: propertyId,
        start: startDate,
        end: endDate,
      },
      {
        headers: {
          "Content-Type": "application/json",
          pkey: PKEY,
        },
      }
    );

    const priceMap = {};
    pricesResponse.data.forEach(item => {
      priceMap[item.date] = item.price;
    });

    // 📆 3. Spajanje informacija
    const formatted = availableDays.map(day => {
      const date = new Date(day.date).toLocaleDateString("sr-RS");
      const price = priceMap[day.date];
      return `${date} (${price ? `${price} €` : "Cena nije dostupna"})`;
    });

    return res.json({
      message: `Slobodni termini za apartman ${propertyId}:\n${formatted.join(", ")}`
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    return res.status(500).json({ message: "Greška prilikom provere dostupnosti i cena." });
  }
};
