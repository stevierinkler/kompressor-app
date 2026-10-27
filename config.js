// Konfiguration: Vorlagen und Kompressoren.
// Messpunkte hier ergänzen, entfernen oder umbenennen – die App und die PDF passen sich automatisch an.
// Jeder Messpunkt braucht eine eindeutige "id". Eine id nie wiederverwenden, sonst landen alte Werte im falschen Feld.

const TEMPLATES = {
  HD: {
    title: "TÄGLICHE ÜBERWACHUNGSLISTE",
    subtitle: "Hochdruck-Kompressor",
    showLimits: true,     // Max/Min-Spalte anzeigen
    hasNotes: true,       // Bemerkungsfeld
    sections: [
      { title: "DISPLAY", items: [
        { id: "netzdruck",      label: "Netzdruck",                 unit: "Bar",  limit: "42" },
        { id: "luft_nachk",     label: "Lufttemp. Nachkühler",      unit: "°C",   limit: "35" },
        { id: "oeldruck",       label: "Öldruck",                   unit: "bar",  limit: "1,5" },
        { id: "aus_t1",         label: "Austrittstemp. 1. Stufe",   unit: "°C",   limit: "230" },
        { id: "aus_t2",         label: "Austrittstemp. 2. Stufe",   unit: "°C",   limit: "225" },
        { id: "aus_t3",         label: "Austrittstemp. 3. Stufe",   unit: "°C",   limit: "185" },
        { id: "kw_t3",          label: "Kühlwassertemp. 3. Stufe",  unit: "°C",   limit: "70" },
        { id: "gesamtstd",      label: "Gesamtstunden",             unit: "Std.", limit: "" },
        { id: "laststd",        label: "Laststunden",               unit: "Std.", limit: "" },
      ]},
      { title: "DRÜCKE", items: [
        { id: "aus_p1",         label: "Austrittsdruck 1. Stufe",   unit: "Bar",  limit: "5,5" },
        { id: "aus_p2",         label: "Austrittsdruck 2. Stufe",   unit: "Bar",  limit: "16" },
      ]},
      { title: "COMPRESSOR UNIT – TEMPERATUREN", items: [
        { id: "umgebung",       label: "Umgebungstemperatur",           unit: "°C", limit: "35" },
        { id: "oeltemp",        label: "Öltemperatur",                  unit: "°C", limit: "65" },
        { id: "ein_t2",         label: "Eintrittstemp. Luft 2. Stufe",  unit: "°C", limit: "60" },
        { id: "ein_t3",         label: "Eintrittstemp. Luft 3. Stufe",  unit: "°C", limit: "60" },
        { id: "kessel_t",       label: "Luftkesseltemperatur",          unit: "°C", limit: "45" },
      ]},
      { title: "TROCKNER", items: [
        { id: "kw_ein",         label: "Kühlwassereintrittstemp.",      unit: "°C", limit: "45" },
        { id: "kw_aus",         label: "Kühlwasseraustrittstemp.",      unit: "°C", limit: "" },
        { id: "taupunkt",       label: "Taupunkt Kältetrockner Temp.",  unit: "°C", limit: "8" },
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
    hasNotes: false,
    sections: [
      { title: "BETRIEBSSTUNDEN (1 x wöchentlich, Freitag)", numbered: false, items: [
        { id: "laufzeit",       label: "Laufzeit", unit: "Std.", fridayOnly: true },
        { id: "lastzeit",       label: "Lastzeit", unit: "Std.", fridayOnly: true },
      ]},
      { title: "DRÜCKE", items: [
        { id: "p_auslass",      label: "Kompressorauslass",  unit: "bar" },
        { id: "p_luftfilter",   label: "Luftfilter",         unit: "bar" },
        { id: "p_oel",          label: "Öldruckkontrolle",   unit: "bar" },
        { id: "p_zwischen",     label: "Zwischenkühler",     unit: "bar" },
      ]},
      { title: "TEMPERATUREN", items: [
        { id: "t_auslass",      label: "Kompressorauslass",          unit: "°C" },
        { id: "t_e1_aus",       label: "Element 1 Auslass",          unit: "°C" },
        { id: "t_e2_ein",       label: "Element 2 Einlass",          unit: "°C" },
        { id: "t_e2_aus",       label: "Element 2 Auslass",          unit: "°C" },
        { id: "t_kw_ein",       label: "Kühlwasser Einlass",         unit: "°C" },
        { id: "t_kw_aus_nd",    label: "Kühlwasserauslass ND Stufe", unit: "°C" },
        { id: "t_kw_aus",       label: "Kühlwasserauslass",          unit: "°C" },
        { id: "t_oel",          label: "Öltemperatur",               unit: "°C" },
        { id: "t_dp_lp",        label: "DP LP Kühlwasser",           unit: "°C" },
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
