module.exports = async (req, res) => {
  try {
    const { message, available_apartments, checkin_date, checkout_date, guests } = req.body;

    console.log("📥 message:", message);
    console.log("📥 available_apartments (raw):", available_apartments);

    let apartments = [];
    try {
      apartments = JSON.parse(available_apartments || "[]");
      if (!Array.isArray(apartments)) throw new Error("Nije niz");
    } catch (e) {
      return res.json({
        message: "⚠️ Lista dostupnih apartmana nije ispravna. Pokušajte ponovo."
      });
    }

    const userInput = (message || "").trim().toLowerCase().replace(/\s+/g, "");
    const index = Number(userInput) - 1;
    let selected = null;

    if (!isNaN(index) && index >= 0 && index < apartments.length) {
      selected = apartments[index];
    } else {
      selected = apartments.find(a => {
        const normalizedName = (a.name || "").toLowerCase().replace(/\s+/g, "");
        return normalizedName === userInput || normalizedName.includes(userInput);
      });
    }

    if (!selected) {
      return res.json({
        message: `⚠️ Nismo pronašli apartman "${message}". Pokušajte ponovo upisivanjem broja ili naziva.`
      });
    }

    return res.json({
      message: `🔒 Izabrali ste: ${selected.name} od ${checkin_date} do ${checkout_date} za ${guests} osobe.\n\nUkupna cena: ${selected.price} €.\n\n✅ Da li želite da nastavite sa rezervacijom?`,
      set_variables: {
        selected_apartment: JSON.stringify(selected),
        selected_checkin: checkin_date,
        selected_checkout: checkout_date,
        selected_guests: guests,
        calculated_price: selected.price.toString(),
        apartment_key: selected.key,
        next_action: "Potvrda rezervacije"
      }
    });
  } catch (error) {
    console.error("Greška:", error.message);
    return res.status(500).json({ message: "Greška u obradi zahteva.", error: error.message });
  }
};
