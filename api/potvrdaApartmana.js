module.exports = async (req, res) => {
  try {
    const { message, available_apartments, checkin_date, checkout_date, guests } = req.body;

    const apartments = JSON.parse(available_apartments || "[]");

    // Očisti korisnički unos: mala slova, bez razmaka
    const userInput = message.trim().toLowerCase().replace(/\s+/g, "");

    // Ako je korisnik uneo broj, pokušaj da izvučeš apartman po redosledu
    const index = Number(userInput) - 1;
    let selected = !isNaN(index) && apartments[index] ? apartments[index] : null;

    // Ako nije broj ili nije validan, pokušaj da pronađeš apartman po imenu
    if (!selected) {
      selected = apartments.find(a => {
        const apartmentNameNormalized = a.name.toLowerCase().replace(/\s+/g, "");
        return apartmentNameNormalized === userInput || apartmentNameNormalized.includes(userInput);
      });
    }

    // Ako i dalje nije pronađen, javi korisniku
    if (!selected) {
      return res.json({
        message: `⚠️ Nismo pronašli apartman "${message}". Pokušajte ponovo upisivanjem broja ili naziva.`
      });
    }

    // Ako je pronađen, vrati potvrdu
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
