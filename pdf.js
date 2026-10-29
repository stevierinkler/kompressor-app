/* Wochen-PDF: eine A4-Seite pro Kompressor, Reihenfolge wie in COMPRESSORS (HD zuerst). */

function buildPdf(w, wk) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const C = {
    navy: [31, 56, 100], head: [217, 225, 242], limit: [226, 239, 218], band: [242, 242, 242],
    grey: [217, 217, 217], line: [128, 128, 128], blue: [0, 51, 170], text: [20, 20, 20],
    ok: [46, 125, 50], nok: [198, 40, 40], muted: [95, 107, 122],
  };
  const L = 12, PW = 210, W = PW - 2 * L, PAGE_BOTTOM = 284;
  const created = new Date();
  const createdTxt = created.toLocaleDateString("de-DE") + " " + created.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const setFill = c => doc.setFillColor(c[0], c[1], c[2]);
  const setText = c => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = c => doc.setDrawColor(c[0], c[1], c[2]);
  function box(x, y, wd, h, fill) {
    setDraw(C.line); doc.setLineWidth(0.2);
    if (fill) { setFill(fill); doc.rect(x, y, wd, h, "FD"); } else doc.rect(x, y, wd, h, "S");
  }
  function txt(s, x, y, opt = {}) {
    doc.setFont("helvetica", opt.bold ? "bold" : "normal");
    doc.setFontSize(opt.size || 8.5);
    setText(opt.color || C.text);
    doc.text(String(s), x, y, { align: opt.align || "left", baseline: "middle", maxWidth: opt.maxWidth });
  }
  // Text so verkleinern, dass er in die Breite passt
  function fitTxt(s, x, y, maxW, opt = {}) {
    let size = opt.size || 8.5;
    doc.setFont("helvetica", opt.bold ? "bold" : "normal");
    doc.setFontSize(size);
    while (doc.getTextWidth(String(s)) > maxW && size > 5) { size -= 0.5; doc.setFontSize(size); }
    txt(s, x, y, { ...opt, size });
  }
  function drawCheck(cx, cy, ok) {
    doc.setLineWidth(0.55);
    if (ok) { setDraw(C.ok); doc.line(cx - 1.8, cy, cx - 0.5, cy + 1.4); doc.line(cx - 0.5, cy + 1.4, cx + 2, cy - 1.6); }
    else { setDraw(C.nok); doc.line(cx - 1.5, cy - 1.5, cx + 1.5, cy + 1.5); doc.line(cx - 1.5, cy + 1.5, cx + 1.5, cy - 1.5); }
    doc.setLineWidth(0.2);
  }

  COMPRESSORS.forEach((comp, pageIdx) => {
    if (pageIdx > 0) doc.addPage();
    const tpl = TEMPLATES[comp.type];
    const lim = tpl.showLimits;
    // Spaltenbreiten
    const cNr = 8, cUnit = 13, cLim = lim ? 17 : 0;
    const cDay = lim ? 18.8 : 20.4;
    const cLbl = W - cNr - cUnit - cLim - 5 * cDay;
    const xNr = L, xLbl = xNr + cNr, xUnit = xLbl + cLbl, xLim = xUnit + cUnit, xDay = xLim + cLim;

    // Kopf
    txt(tpl.title, L, 15, { bold: true, size: 14 });
    txt(tpl.subtitle, L, 21, { bold: true, size: 9, color: C.muted });
    let y = 26;
    box(L, y, 48, 8, C.head); txt("Kompressor / Anlage Nr.", L + 2, y + 4, { bold: true });
    box(L + 48, y, 30, 8); txt(comp.id, L + 63, y + 4, { bold: true, size: 11, color: C.blue, align: "center" });
    box(L + 84, y, 14, 8, C.head); txt("KW", L + 91, y + 4, { bold: true, align: "center" });
    box(L + 98, y, 30, 8); txt(`${wk.week} / ${wk.year}`, L + 113, y + 4, { bold: true, size: 11, color: C.blue, align: "center" });

    // Tabellenkopf
    y = 38;
    const hh = 10;
    box(xNr, y, cNr, hh, C.head); txt("Nr.", xNr + cNr / 2, y + hh / 2, { bold: true, align: "center" });
    box(xLbl, y, cLbl, hh, C.head); txt("Bezeichnung", xLbl + cLbl / 2, y + hh / 2, { bold: true, align: "center" });
    box(xUnit, y, cUnit, hh, C.head); txt("Einheit", xUnit + cUnit / 2, y + hh / 2, { bold: true, align: "center", size: 8 });
    if (lim) { box(xLim, y, cLim, hh, C.head); txt("Max/Min", xLim + cLim / 2, y + hh / 2, { bold: true, align: "center", size: 8 }); }
    for (let d = 0; d < 5; d++) {
      const x = xDay + d * cDay;
      box(x, y, cDay, hh, C.head);
      txt(DAYS[d], x + cDay / 2, y + 3.6, { bold: true, align: "center" });
      txt(fmt(dateOf(wk, d)), x + cDay / 2, y + 7.2, { size: 7, align: "center", color: C.muted });
    }
    y += hh;

    const RH = comp.type === "HD" ? 5.8 : 6.4;
    function band(title) {
      setFill(C.navy); setDraw(C.line); doc.rect(L, y, W, RH, "FD");
      txt(title, L + 2, y + RH / 2, { bold: true, color: [255, 255, 255], size: 8.5 });
      y += RH;
    }

    // Messwerte
    let nr = 0;
    for (const s of tpl.sections) {
      band(s.title + (s.check ? "  (Haken = in Ordnung, Kreuz = Mangel)" : ""));
      s.items.forEach((it, i) => {
        const fill = i % 2 ? C.band : null;
        const n = s.numbered === false || it.type === "check" ? "" : ++nr;
        box(xNr, y, cNr, RH, fill); if (n) txt(n, xNr + cNr / 2, y + RH / 2, { align: "center" });
        box(xLbl, y, cLbl, RH, fill); fitTxt(it.label, xLbl + 1.5, y + RH / 2, cLbl - 3);
        box(xUnit, y, cUnit, RH, fill); txt(it.unit || "", xUnit + cUnit / 2, y + RH / 2, { align: "center" });
        if (lim) { box(xLim, y, cLim, RH, C.limit); if (it.limit) txt(it.limit, xLim + cLim / 2, y + RH / 2, { bold: true, align: "center" }); }
        for (let d = 0; d < 5; d++) {
          const x = xDay + d * cDay;
          const na = it.fridayOnly && d !== 4;
          box(x, y, cDay, RH, na ? C.grey : fill);
          if (na) continue;
          const v = getVals(w, d, comp.id)[it.id];
          if (v == null || v === "") continue;
          if (it.type === "check") drawCheck(x + cDay / 2, y + RH / 2, v === "ok");
          else fitTxt(String(v).replace(".", ","), x + cDay / 2, y + RH / 2, cDay - 2, { bold: true, color: C.blue, align: "center", size: 9 });
        }
        y += RH;
      });
    }

    // Unterzeichnung
    band("UNTERZEICHNUNG");
    // Für HD und ND gleich: oben Name + Datum, darunter nur die Unterschrift
    const rows = ["Ausgefüllt durch", "Unterschrift"];
    const SH = 10;
    rows.forEach(label => {
      const leftW = xDay - L;
      box(L, y, leftW, SH); txt(label, L + 2, y + SH / 2, { bold: true });
      for (let d = 0; d < 5; d++) {
        const x = xDay + d * cDay;
        box(x, y, cDay, SH);
        const sg = w.sign[d];
        if (!sg || !sg.name) continue;
        const dateTxt = fmt(new Date(sg.date));
        if (label === "Ausgefüllt durch") {
          // Name (max. 2 Zeilen) und darunter das Datum der Unterzeichnung
          const lines = doc.setFont("helvetica", "normal").setFontSize(7).splitTextToSize(sg.name, cDay - 2).slice(0, 2);
          const all = [...lines, dateTxt];
          all.forEach((ln, k) => txt(ln, x + cDay / 2, y + SH / 2 + (k - (all.length - 1) / 2) * 2.8,
            k < lines.length ? { size: 7, color: C.blue, align: "center" } : { size: 6.5, color: C.muted, align: "center" }));
        } else if (sg.img) {
          // Zeile „Unterschrift“: nur das Unterschriftsbild (ältere Einträge ohne Unterschrift bleiben leer)
          try {
            const p = doc.getImageProperties(sg.img);
            const maxW = cDay - 2, maxH = SH - 1.5;
            const sc = Math.min(maxW / p.width, maxH / p.height);
            const iw = p.width * sc, ih = p.height * sc;
            doc.addImage(sg.img, "PNG", x + (cDay - iw) / 2, y + 0.6, iw, ih, `sig${d}`, "FAST");
          } catch {}
        }
      }
      y += SH;
    });

    // Bemerkung
    if (tpl.hasNotes) {
      y += 4;
      const bh = Math.max(16, PAGE_BOTTOM - y - 2);
      const leftW = xLbl + cLbl - L;
      box(L, y, leftW, bh, C.head); txt("Bemerkung", L + 2, y + 4.5, { bold: true });
      box(L + leftW, y, W - leftW, bh);
      const parts = [];
      for (let d = 0; d < 5; d++) {
        const n = (w.notes[d] || {})[comp.id];
        if (n && n.trim()) parts.push(`${DAYS[d]} ${fmt(dateOf(wk, d))}: ${n.trim().replace(/\s+/g, " ")}`);
      }
      if (parts.length) {
        doc.setFont("helvetica", "normal").setFontSize(8);
        let ty = y + 4;
        for (const p of parts) {
          for (const ln of doc.splitTextToSize(p, W - leftW - 4)) {
            if (ty > y + bh - 2) break;
            txt(ln, L + leftW + 2, ty, { size: 8, color: C.blue });
            ty += 3.6;
          }
        }
      }
    }

    // Fußzeile
    setDraw([200, 200, 200]); doc.line(L, 288, PW - L, 288);
    txt(`KW ${wk.week} / ${wk.year}  ·  erstellt am ${createdTxt}`, L, 291.5, { size: 7, color: C.muted });
    txt(`Seite ${pageIdx + 1} von ${COMPRESSORS.length}`, PW - L, 291.5, { size: 7, color: C.muted, align: "right" });
  });

  return doc.output("blob");
}
