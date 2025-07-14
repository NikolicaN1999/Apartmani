module.exports = async (req, res) => {
  try {
    const { message, available_apartments, checkin_date, checkout_date, guests } = req.body;

    let apartments = [];
    try {
      apartments = JSON.parse(available_apartments || "[]");
      if (!Array.isArray(apartments)) throw new Error("Not an array");
    } catch (parseErr) {
      return res.json({
        message: `⚠️ Došlo je do greške pri obradi dostupnih apartmana. Molimo pokušajte ponovo.`
      });
    }

    const userInput = message.trim().toLowerCase();

    // Traži po broju (indeks u listi) ili po imenu apartmana
    const index = Number(userInput) - 1;
    const selected = !isNaN(index) && apartments[index]
      ? apartments[index]
      : apartments.find(a => a.name.toLowerCase().includes(userInput));

    if (!selected) {
      return res.json({
        message: `⚠️ Nismo pronašli apartman "${message}". Pokušajte ponovo upisivanjem broja ili naziva.`
      });
    }

    return res.json({
      message: `🔒 Izabrali ste: ${selected.name} od ${checkin_date} do ${checkout_date} za ${guests} osobe.\n\nUkupna cena: ${selected.price} €.\n\n✅ Da li želite da nastavite sa rezervacijom?`,
      set_variables: {
        selected_apartment: selected.name,
        selected_checkin: checkin_date,
        selected_checkout: checkout_date,
        selected_guests: guests,
        calculated_price: selected.price.toString(),
        apartment_key: selected.key,
        next_action: "Potvrda rezervacije"
      }
    });

  } catch (err) {
    console.error("Greška:", err);
    return res.status(500).json({ message: "Došlo je do interne greške. Pokušajte ponovo." });
  }
};
