const axios = require("axios");

const API_URL = "https://app.otasync.me/api/calendar/get";
const PROPERTY_ID = 322; // ID tvoje nekretnine
const API_KEY = "f0e632e0452a72e1106e3baece5a77ac396a88c2"; // tvoj pkey

module.exports = async (req, res) => {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${API_KEY}`
      },
      params: {
        id_properties: PROPERTY_ID
      }
    });

    const reservations = response.data.calendar || [];

    const today = new Date();
    const numberOfDaysToCheck = 90;
    const freeDates = [];

    for (let i = 0; i < numberOfDaysToCheck; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      checkDate.setHours(0, 0, 0, 0);

      let isFree = true;

      for (let resItem of reservations) {
        const start = new Date(resItem.start);
        const end = new Date(resItem.end);
        if (checkDate >= start && checkDate < end) {
          isFree = false;
          break;
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
    console.error("Greška pri pozivanju Otasync API-ja:", error.response?.data || error);
    return res.status(500).json({ message: "Greška pri proveri dostupnosti." });
  }
};
