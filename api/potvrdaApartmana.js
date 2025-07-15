module.exports = async (req, res) => {
  try {
    const { message, available_apartments, checkin_date, checkout_date, guests } = req.body;

    const apartments = JSON.parse(available_apartments || "[]");
    const userInput = message.trim().toLowerCase().replace(/\s+/g, "");

    // Pokušaj da korisnik unosi broj
    const index = Number(userInput) - 1;
    let selected = !isNaN(index) && apartments[index]
      ? apartments[index]
      : null;

    // Ako nije broj, traži po imenu (bez razmaka i malim slovima)
    if (!selected) {
      selected = apartments.find(a => 
        a.name.toLowerCase().replace(/\s+/g, "") === userInput || // potpuno poklapanje
        a.name.toLowerCase().replace(/\s+/g, "").includes(userInput) // delimično poklapanje
      );
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
