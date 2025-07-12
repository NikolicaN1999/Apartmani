module.exports = async (req, res) => {
  try {
    const { message, available_apartments, checkin_date, checkout_date, guests } = req.body;

    const apartments = JSON.parse(available_apartments || "[]");
    const userInput = message.trim().toLowerCase();

    // pokušaj da nađe po rednom broju ili delu imena
    const selected =
      !isNaN(userInput) && apartments[Number(userInput) - 1]
        ? apartments[Number(userInput) - 1]
        : apartments.find(a => a.name.toLowerCase().includes(userInput));

    if (!selected) {
      return res.json({
        message: `⚠️ Nismo pronašli apartman "${message}". Pokušajte ponovo upisivanjem broja ili naziva.`
      });
    }

    // Tek sad kad imamo selected, tražimo apartmentKey
    const apartmentMap = {
      S1: { name: "STUDIO 1" },
      S2: { name: "STUDIO 2" },
      S3: { name: "STUDIO 3" },
      S4: { name: "STUDIO 4" },
      S13: { name: "APARTMAN 13" },
      S14: { name: "APARTMAN 14" },
      S15: { name: "APARTMAN 15" },
      S16: { name: "APARTMAN 16" },
      S17: { name: "APARTMAN 17" },
      S18: { name: "APARTMAN 18" },
      S19: { name: "APARTMAN 19" },
    };

    const apartmentKey = Object.keys(apartmentMap).find(
      key => apartmentMap[key].name.toLowerCase() === selected.name.toLowerCase()
    );

    return res.json({
      message: `🔒 Izabrali ste: ${selected.name} od ${checkin_date} do ${checkout_date} za ${guests} osobe.\n\nUkupna cena: ${selected.price} €.\n\n✅ Da li želite da nastavite sa rezervacijom?`,
      set_variables: {
        selected_apartment: selected.name,
        selected_checkin: checkin_date,
        selected_checkout: checkout_date,
        selected_guests: guests,
        calculated_price: selected.price.toString(),
        apartment_key: apartmentKey, // S1, S19 itd.
        next_action: "Potvrda rezervacije"
      }
    });

  } catch (err) {
    console.error("Greška:", err);
    return res.status(500).json({ message: "Došlo je do greške. Pokušajte ponovo." });
  }
};
