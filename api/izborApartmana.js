module.exports = async (req, res) => {
  try {
    const { selected_apartment, checkin_date, checkout_date, guests } = req.body;

    const selected = JSON.parse(selected_apartment || "{}");

    if (!selected?.name) {
      return res.json({
        message: `⚠️ Došlo je do greške pri izboru apartmana. Pokušajte ponovo.`
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

  } catch (err) {
    console.error("Greška:", err);
    return res.status(500).json({ message: "Došlo je do greške. Pokušajte ponovo." });
  }
};
