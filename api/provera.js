const axios = require("axios");
const ical = require("node-ical");

const ICAL_URL = "https://ical.booking.com/v1/export?t=afd3a8c7-7122-4e87-ab76-e8cfb49d4516";

module.exports = async (req, res) => {
  try {
    const response = await axios.get(ICAL_URL);
    const events = ical.parseICS(response.data);

    const today = new Date();
    const numberOfDaysToCheck = 180; // možeš promeniti na 180, 365 itd.
    const freeDates = [];

    for (let i = 0; i < numberOfDaysToCheck; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);

      let isFree = true;
      for (let key in events) {
        const event = events[key];
        if (event.type === "VEVENT") {
          const start = new Date(event.start);
          const end = new Date(event.end);

          if (checkDate >= start && checkDate < end) {
            isFree = false;
            break;
          }
        }
      }

      if (isFree) {
        const formattedDate = checkDate.toLocaleDateString("sr-RS");
        freeDates.push(formattedDate);
      }
    }

    if (freeDates.length === 0) {
      return res.json({ message: "Nažalost, nema slobodnih datuma u narednih 90 dana." });
    } else {
      return res.json({
        message: `Slobodni datumi u narednih 90 dana su: ${freeDates.join(", ")}`
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška pri proveri dostupnosti." });
  }
};
