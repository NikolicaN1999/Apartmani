module.exports = async (req, res) => {
  try {
    const { message, available_apartments, checkin_date, checkout_date, guests } = req.body;

    const apartments = JSON.parse(available_apartments || "[]");

    const userInput = message.trim().toLowerCase();

    // pokušaj da nađe po rednom broju
    const selected =
      !isNaN(userInput) && apartments[Number(userInput) - 1]
        ? apartments[Number(userInput) - 1]
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
        next_action: "Potvrda rezervacije"
      }
    });

  } catch (err) {
    console.error("Greška:", err);
    return res.status(500).json({ message: "Došlo je do greške. Pokušajte ponovo." });
  }
};
