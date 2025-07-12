module.exports = async (req, res) => {
  try {
    const { message, available_apartments, checkin_date, checkout_date, guests } = req.body;

    // available_apartments je sada string sa imenom apartmana, npr. "STUDIO 1"
    const selectedApartmentName = available_apartments.trim();

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
      key => apartmentMap[key].name.toLowerCase() === selectedApartmentName.toLowerCase()
    );

    if (!apartmentKey) {
      return res.json({
        message: `⚠️ Ne mogu da pronađem ključ za apartman "${selectedApartmentName}".`
      });
    }

    return res.json({
      message: `🔒 Izabrali ste: ${selectedApartmentName} od ${checkin_date} do ${checkout_date} za ${guests} osobe.\n\n✅ Da li želite da nastavite sa rezervacijom?`,
      set_variables: {
        selected_apartment: selectedApartmentName,
        selected_checkin: checkin_date,
        selected_checkout: checkout_date,
        selected_guests: guests,
        apartment_key: apartmentKey,
        next_action: "Potvrda rezervacije"
      }
    });

  } catch (err) {
    console.error("Greška:", err);
    return res.status(500).json({ message: "Došlo je do greške. Pokušajte ponovo." });
  }
};
