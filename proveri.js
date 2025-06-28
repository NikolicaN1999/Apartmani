const axios = require("axios");
const ical = require("node-ical");

const ICAL_URL = "https://ical.booking.com/v1/export?t=afd3a8c7-7122-4e87-ab76-e8cfb49d4516";

module.exports = async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ message: "Datum nije prosleđen." });
  }

  try {
    const response = await axios.get(ICAL_URL);
    const events = ical.parseICS(response.data);
    const dateToCheck = new Date(date);

    for (let key in events) {
      const event = events[key];
      if (event.type === "VEVENT") {
        const start = new Date(event.start);
        const end = new Date(event.end);

        if (dateToCheck >= start && dateToCheck < end) {
          return res.json({ message: `❌ Apartman je zauzet na dan ${date}.` });
        }
      }
    }

    return res.json({ message: `✅ Apartman je slobodan na dan ${date}.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška pri proveri dostupnosti." });
  }
};
