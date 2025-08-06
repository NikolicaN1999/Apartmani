module.exports = async (req, res) => {
  try {
    const { message, available_apartments, selected_checkin, selected_checkout, selected_guests } = req.body;

    const checkin_date = selected_checkin;
    const checkout_date = selected_checkout;
    const guests = selected_guests;

    let apartments = [];

    try {
      apartments = typeof available_apartments === "string"
        ? JSON.parse(available_apartments)
        : available_apartments;
    } catch (e) {
      console.error("Greška pri parsiranju available_apartments:", e.message);
      return res.status(400).json({ message: "available_apartments nije validan." });
    }

    const userInput = message.trim().toLowerCase().replace(/\s+/g, "");
    const index = Number(userInput) - 1;
    const selected = !isNaN(index) && apartments[index]
      ? apartments[index]
      : apartments.find(a => a.name.toLowerCase().replace(/\s+/g, "").includes(userInput));

    if (!selected) {
      return res.json({
        message: `⚠️ Nismo pronašli apartman "${message}". Pokušajte ponovo upisivanjem broja ili naziva.`,
        actions: apartments.map((apt, i) => ({
          label: `${i + 1}. ${apt.name}`,
          value: (i + 1).toString()
        }))
      });
    }

    let selectedApartmentString;
    try {
      selectedApartmentString = JSON.stringify(selected);
    } catch (e) {
      console.error("Greška kod JSON.stringify:", e.message);
      return res.status(500).json({ message: "Greška kod obrade apartmana." });
    }

    return res.json({
      message: `🔒 Izabrali ste: ${selected.name} od ${checkin_date} do ${checkout_date} za ${guests} osobe.\n\nUkupna cena: ${selected.price} €.\n\n✅ Da li želite da nastavite sa rezervacijom?`,
      set_variables: {
        selected_apartment: selectedApartmentString,
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
