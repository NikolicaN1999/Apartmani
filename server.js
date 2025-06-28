const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const isDateAvailable = require("./index");

app.use(bodyParser.json());

app.post("/proveri-datum", async (req, res) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ message: "Niste uneli datum." });
  }

  const dostupnost = await isDateAvailable(date);

  if (dostupnost === null) {
    return res.json({ message: "❌ Došlo je do greške. Pokušajte ponovo." });
  }

  return res.json({
    message: dostupnost
      ? `✅ Apartman je slobodan na dan ${date}.`
      : `❌ Nažalost, apartman je zauzet na dan ${date}.`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server radi na portu ${PORT}`);
});
