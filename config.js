// Konfiguration: Vorlagen und Kompressoren.
// Messpunkte hier ergänzen, entfernen oder umbenennen – die App und die PDF passen sich automatisch an.
// Jeder Messpunkt braucht eine eindeutige "id". Eine id nie wiederverwenden, sonst landen alte Werte im falschen Feld.
// Zusatzangaben:
//   fridayOnly: true  -> nur freitags erfassen (Mo–Do grau in der PDF)
//   counter: true     -> Betriebsstundenzähler: Plausibilitätsprüfung gegen den letzten erfassten Freitag
//   notAbove: "id"    -> Wert darf nicht größer sein als der Messpunkt mit dieser id (z. B. Last ≤ Gesamt)
//   standbySkip: true -> entfällt, wenn der Kompressor auf „Standby“ oder „Aus“ steht
// Abschnitt mit stamp: true -> dort steht in der PDF bei Standby/Aus der senkrechte Schriftzug

const TEMPLATES = {
  HD: {
    title: "TÄGLICHE ÜBERWACHUNGSLISTE",
    subtitle: "Hochdruck-Kompressor",
    showLimits: true,     // Max/Min-Spalte anzeigen
    hasNotes: true,       // Bemerkungsfeld
    sections: [
      { title: "BETRIEBSSTUNDEN (1 x wöchentlich, Freitag)", numbered: false, items: [
        { id: "gesamtstd",      label: "Gesamtstunden",             unit: "Std.", limit: "", fridayOnly: true, counter: true },
        { id: "laststd",        label: "Laststunden",               unit: "Std.", limit: "", fridayOnly: true, counter: true, notAbove: "gesamtstd" },
      ]},
      { title: "DISPLAY", stamp: true, items: [
        { id: "netzdruck",      label: "Netzdruck",                 unit: "Bar",  limit: "42", standbySkip: true },
        { id: "luft_nachk",     label: "Lufttemp. Nachkühler",      unit: "°C",   limit: "35", standbySkip: true },
        { id: "oeldruck",       label: "Öldruck",                   unit: "bar",  limit: "1,5", standbySkip: true },
        { id: "aus_t1",         label: "Austrittstemp. 1. Stufe",   unit: "°C",   limit: "230", standbySkip: true },
        { id: "aus_t2",         label: "Austrittstemp. 2. Stufe",   unit: "°C",   limit: "225", standbySkip: true },
        { id: "aus_t3",         label: "Austrittstemp. 3. Stufe",   unit: "°C",   limit: "185", standbySkip: true },
        { id: "kw_t3",          label: "Kühlwassertemp. 3. Stufe",  unit: "°C",   limit: "70", standbySkip: true },
      ]},
      { title: "DRÜCKE", items: [
        { id: "aus_p1",         label: "Austrittsdruck 1. Stufe",   unit: "Bar",  limit: "5,5", standbySkip: true },
        { id: "aus_p2",         label: "Austrittsdruck 2. Stufe",   unit: "Bar",  limit: "16", standbySkip: true },
      ]},
      { title: "COMPRESSOR UNIT – TEMPERATUREN", items: [
        { id: "umgebung",       label: "Umgebungstemperatur",           unit: "°C", limit: "35", standbySkip: true },
        { id: "oeltemp",        label: "Öltemperatur",                  unit: "°C", limit: "65", standbySkip: true },
        { id: "ein_t2",         label: "Eintrittstemp. Luft 2. Stufe",  unit: "°C", limit: "60", standbySkip: true },
        { id: "ein_t3",         label: "Eintrittstemp. Luft 3. Stufe",  unit: "°C", limit: "60", standbySkip: true },
        { id: "kessel_t",       label: "Luftkesseltemperatur",          unit: "°C", limit: "45", standbySkip: true },
      ]},
      { title: "TROCKNER", items: [
        { id: "kw_ein",         label: "Lufteintrittstemp.",            unit: "°C", limit: "45", standbySkip: true }, // Trockner luftgekühlt; id bleibt wegen gespeicherter Werte
        { id: "kw_aus",         label: "Luftaustrittstemp.",            unit: "°C", limit: "", standbySkip: true },
        { id: "taupunkt",       label: "Taupunkt Kältetrockner Temp.",  unit: "°C", limit: "8", standbySkip: true },
      ]},
      { title: "KONTROLLPUNKTE", check: true, items: [
        { id: "c_oelfilter",    label: "Ölfilter (regelmässig drehen)", type: "check" },
        { id: "c_oelniveau",    label: "Ölniveau",                      type: "check" },
        { id: "c_ablass",       label: "Ablassventile Kontrolle",       type: "check" },
        { id: "c_geraeusch",    label: "Anormale Geräusche",            type: "check" },
        { id: "c_schlauch",     label: "Kontrolle Flex. Schlauch",      type: "check" },
        { id: "c_vibration",    label: "Anormale Vibrationen",          type: "check" },
      ]},
    ],
  },

  ND: {
    title: "KONTROLLE NIEDERDRUCK KOMPRESSOREN",
    subtitle: "UP D 05-3-4",
    showLimits: false,
    hasNotes: true,
    sections: [
      { title: "BETRIEBSSTUNDEN (1 x wöchentlich, Freitag)", numbered: false, items: [
        { id: "laufzeit",       label: "Laufzeit", unit: "Std.", fridayOnly: true, counter: true },
        { id: "lastzeit",       label: "Lastzeit", unit: "Std.", fridayOnly: true, counter: true, notAbove: "laufzeit" },
      ]},
      { title: "DRÜCKE", stamp: true, items: [
        { id: "p_auslass",      label: "Kompressorauslass",  unit: "bar", standbySkip: true },
        { id: "p_luftfilter",   label: "Luftfilter",         unit: "mbar", standbySkip: true }, // Differenzdruck, Minus erlaubt
        { id: "p_oel",          label: "Öldruckkontrolle",   unit: "bar", standbySkip: true },
        { id: "p_zwischen",     label: "Zwischenkühler",     unit: "bar", standbySkip: true },
      ]},
      { title: "TEMPERATUREN", items: [
        { id: "t_auslass",      label: "Kompressorauslass",          unit: "°C", standbySkip: true },
        { id: "t_e1_aus",       label: "Element 1 Auslass",          unit: "°C", standbySkip: true },
        { id: "t_e2_ein",       label: "Element 2 Einlass",          unit: "°C", standbySkip: true },
        { id: "t_e2_aus",       label: "Element 2 Auslass",          unit: "°C", standbySkip: true },
        { id: "t_kw_ein",       label: "Kühlwasser Einlass",         unit: "°C", standbySkip: true },
        { id: "t_kw_aus_nd",    label: "Kühlwasserauslass ND Stufe", unit: "°C", standbySkip: true },
        { id: "t_kw_aus",       label: "Kühlwasserauslass",          unit: "°C", standbySkip: true },
        { id: "t_oel",          label: "Öltemperatur",               unit: "°C", standbySkip: true },
        { id: "t_dp_lp",        label: "DP LP Kühlwasser",           unit: "°C", standbySkip: true },
      ]},
      { title: "KONTROLLPUNKTE", check: true, items: [
        { id: "c_kondensat",    label: "Kondensatabscheider auf Funktion prüfen", type: "check" },
      ]},
    ],
  },
};

// Reihenfolge = Reihenfolge beim Rundgang und in der PDF
const COMPRESSORS = [
  { id: "HD1", type: "HD" },
  { id: "HD2", type: "HD" },
  { id: "HD3", type: "HD" },
  { id: "ND1", type: "ND" },
  { id: "ND2", type: "ND" },
  { id: "ND3", type: "ND" },
  { id: "ND4", type: "ND" },
];
