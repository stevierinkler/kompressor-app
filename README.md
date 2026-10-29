# Kompressor-Kontrolle

Web-App zur digitalen Erfassung der täglichen Kontrollwerte von Hoch- und Niederdruck-Kompressoren. Ersetzt die Papier-Kontrolllisten und erzeugt am Ende der Woche eine PDF (eine Seite pro Kompressor).

## Funktionen

- Tagesansicht pro Kompressor mit allen Messpunkten, Einheit und (bei HD) Max/Min-Referenzwert
- Feste Rundgang-Reihenfolge: HD1 → HD2 → HD3 → ND1 → ND2 → ND3 → ND4, freies Wechseln über die Leiste oben
- Vollständigkeits-Check beim Wechsel zum nächsten Kompressor
- Kalenderwoche und Datum werden automatisch gesetzt; Betriebsstunden (ND) nur freitags
- Startseite mit „Erfassung starten“ / „Weitermachen“ / „Heute erledigt“; am Wochenende keine Erfassung
- Abzeichnung einmal pro Tag: Name + Datum oder Unterschrift auf dem Display
- Wochenübersicht zum Nachtragen, auch für vergangene Wochen
- Lückenprüfung vor dem Erstellen der PDF
- Sicherung exportieren / importieren (JSON-Datei)
- Läuft nach dem ersten Öffnen komplett offline

## Datenschutz und Sicherheit

- **Keine Datenübertragung.** Messwerte, Namen und Unterschriften werden ausschließlich im Browser-Speicher (localStorage) des jeweiligen Geräts gespeichert.
- **Kein Server, kein Konto, kein Tracking.** Die App besteht nur aus statischen Dateien (HTML, CSS, JavaScript).
- **Keine externen Abhängigkeiten zur Laufzeit.** Die PDF-Bibliothek [jsPDF](https://github.com/parallax/jsPDF) (MIT-Lizenz) liegt im Ordner `vendor/`.
- Die PDF wird auf dem Gerät erzeugt und vom Nutzer selbst weitergeleitet.
- Der gesamte Quellcode ist in diesem Repository einsehbar.

## Auf dem Android-Handy einrichten

1. Die Adresse der App in Chrome öffnen.
2. Menü (⋮) → **„Zum Startbildschirm hinzufügen“** bzw. **„App installieren“**.
3. Die App über das neue Symbol starten. Ab jetzt funktioniert sie auch ohne Internet.

Updates werden automatisch geladen, wenn die App mit Internetverbindung geöffnet wird. Auf der Startseite, der Wochenübersicht und den Einstellungen lädt die App sich danach kurz neu und ist sofort aktuell; während einer Eingabe erscheint nur ein Hinweis, und die neue Version ist beim nächsten Öffnen aktiv. Gespeicherte Werte bleiben dabei erhalten.

## Messpunkte anpassen

Alle Vorlagen und Kompressoren stehen in [`config.js`](config.js):

- `TEMPLATES.HD` und `TEMPLATES.ND`: Abschnitte und Messpunkte
- `COMPRESSORS`: Kompressoren und ihre Reihenfolge

Jeder Messpunkt hat eine eindeutige `id`. Eine id nicht umbenennen oder wiederverwenden, sonst passen gespeicherte Werte nicht mehr zum Feld. Nach Änderungen in `sw.js` die Versionsnummer in `CACHE` hochzählen, damit die Geräte die neue Version laden.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Einstieg |
| `config.js` | Vorlagen und Kompressoren |
| `app.js` | Oberfläche, Speicherung, Ablauf |
| `pdf.js` | Erzeugung der Wochen-PDF |
| `style.css` | Gestaltung |
| `sw.js` | Offline-Betrieb (Service Worker) |
| `manifest.webmanifest`, `icons/` | App-Symbol und Startbildschirm |
| `vendor/jspdf.umd.min.js` | PDF-Bibliothek (MIT) |
