const axios = require("axios");
const ical = require("node-ical");

const ICAL_URL = "https://ical.booking.com/v1/export?t=afd3a8c7-7122-4e87-ab76-e8cfb49d4516";

async function isDateAvailable(dateToCheck) {
  try {
    const response = await axios.get(ICAL_URL, { responseType: 'text' }); // <-- ovo je važno!
    const events = ical.parseICS(response.data);

    const date = new Date(dateToCheck);

    for (let key in events) {
      const event = events[key];
      if (event.type === "VEVENT") {
        const start = new Date(event.start);
        const end = new Date(event.end);

        if (date >= start && date < end) {
          return false; // zauzeto
        }
      }
    }

    return true; // slobodno
  } catch (error) {
    console.error("Greška prilikom preuzimanja ili parsiranja iCal fajla:", error);
    return null;
  }
}

// Test:
(async () => {
  const datum = "18-07-2025"; // promeni ako želiš
  const slobodno = await isDateAvailable(datum);

  if (slobodno === null) {
    console.log("Nismo mogli da proverimo dostupnost.");
  } else if (slobodno) {
    console.log(`✅ Apartman je slobodan na dan ${datum}.`);
  } else {
    console.log(`❌ Apartman je zauzet na dan ${datum}.`);
  }
})();
