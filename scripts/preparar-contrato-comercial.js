/**
 * Prepara contrato_comercial.docx para docxtemplater.
 * Reemplaza secuencias de puntos (…) con {{variables}}.
 *
 * Input:  public/contratos/contrato_comercial.docx
 * Output: src/lib/signatura/plantillas/contrato_comercial.docx
 *
 * node scripts/preparar-contrato-comercial.js
 */

const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve('public/contratos/contrato_comercial.docx');
const OUTPUT = path.resolve('src/lib/signatura/plantillas/contrato_comercial.docx');

console.log('Leyendo:', INPUT);
const buf = fs.readFileSync(INPUT);
const zip = new PizZip(buf);
let xml = zip.file('word/document.xml').asText();

let count = 0;

// ─── Helpers ───────────────────────────────────────────────

const isDot = s => /^[….]+$/.test(s);

/** Reemplaza el primer grupo de runs de puntos encontrado después del ancla. */
function replaceDots(anchorText, varName, rpr = sz24) {
  const idx = xml.indexOf(anchorText);
  if (idx === -1) { console.warn('⚠ Ancla no encontrada:', anchorText.substring(0, 70)); return; }

  const wtEnd = xml.indexOf('</w:t>', idx + anchorText.length);
  if (wtEnd === -1) return;
  const wrEnd = xml.indexOf('</w:r>', wtEnd) + 6;

  let dotStart = wrEnd;
  let dotEnd   = wrEnd;

  // El run puede estar precedido/seguido por <w:proofErr .../>
  while (true) {
    let cur = dotEnd;
    // Saltar proofErr opcionales
    let mm;
    while ((mm = xml.substring(cur).match(/^<w:proofErr[^\/]*\/>/))) cur += mm[0].length;

    if (!xml.startsWith('<w:r', cur)) break;

    const tOpen = xml.indexOf('<w:t', cur);
    if (tOpen === -1 || tOpen - cur > 500) break;
    const tClose = xml.indexOf('>', tOpen) + 1;
    const tEnd   = xml.indexOf('</w:t>', tClose);
    if (!isDot(xml.substring(tClose, tEnd))) break;

    dotEnd = xml.indexOf('</w:r>', tEnd) + 6;
    // Saltar proofErr opcionales después del run
    while ((mm = xml.substring(dotEnd).match(/^<w:proofErr[^\/]*\/>/))) dotEnd += mm[0].length;
  }

  if (dotEnd === dotStart) { console.warn('⚠ Sin runs de puntos después de:', anchorText.substring(0, 70)); return; }

  count++;
  xml = xml.substring(0, dotStart) + makeRun(varName, rpr) + xml.substring(dotEnd);
}

/**
 * Para el caso "texto…" en el MISMO run: reemplaza el run completo +
 * todos los runs de puntos siguientes, dejando solo keepPrefix + {{var}}.
 */
function replaceMixed(mixedWtContent, keepPrefix, varName, rpr = sz24) {
  const fullT = `<w:t>${mixedWtContent}</w:t>`;
  const idx   = xml.indexOf(fullT);
  if (idx === -1) { console.warn('⚠ Run mixto no encontrado:', mixedWtContent.substring(0, 50)); return; }

  const runStart = xml.lastIndexOf('<w:r', idx);
  const wrEnd0   = xml.indexOf('</w:r>', idx) + 6;
  let dotEnd = wrEnd0;

  while (true) {
    let cur = dotEnd;
    let mm;
    while ((mm = xml.substring(cur).match(/^<w:proofErr[^\/]*\/>/))) cur += mm[0].length;
    if (!xml.startsWith('<w:r', cur)) break;
    const tOpen = xml.indexOf('<w:t', cur);
    if (tOpen === -1 || tOpen - cur > 500) break;
    const tClose = xml.indexOf('>', tOpen) + 1;
    const tEnd   = xml.indexOf('</w:t>', tClose);
    if (!isDot(xml.substring(tClose, tEnd))) break;
    dotEnd = xml.indexOf('</w:r>', tEnd) + 6;
    while ((mm = xml.substring(dotEnd).match(/^<w:proofErr[^\/]*\/>/))) dotEnd += mm[0].length;
  }

  count++;
  const newRun = `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${keepPrefix}{{${varName}}}</w:t></w:r>`;
  xml = xml.substring(0, runStart) + newRun + xml.substring(dotEnd);
}

/** Genera un run simple con la variable. */
function makeRun(varName, rpr = sz24) {
  return `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">{{${varName}}}</w:t></w:r>`;
}

const sz24   = '<w:sz w:val="24"/><w:szCs w:val="24"/>';
const sz24es = '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="es-AR"/>';
const bold24 = '<w:b/><w:sz w:val="24"/><w:szCs w:val="24"/>';

// ─── PÁRRAFO 2: Fecha y nombre ──────────────────────────────

// Reemplaza los dos runs que contienen "31 de Julio de 2025" con {{fecha}}
// Son los runs con texto " 31 de Julio" y " de 2025, quien "
const dateBlock =
  '<w:r w:rsidR="001F0349" w:rsidRPr="001F0349"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>' +
  '<w:t xml:space="preserve"> 31 de Julio</w:t></w:r>' +
  '<w:r w:rsidR="00816475" w:rsidRPr="001F0349"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>' +
  '<w:t xml:space="preserve"> de 2025, quien </w:t></w:r>';
if (xml.includes(dateBlock)) {
  xml = xml.replace(dateBlock, makeRun('{{fecha}}, quien ', sz24).replace('{{{{fecha}}, quien }}', '{{fecha}}, quien ').replace('xml:space="preserve">{{{{fecha}}, quien }}</w:t>', 'xml:space="preserve"> {{fecha}}, quien </w:t>'));
  // Simpler:
  xml = xml; // ya reemplazado arriba si existía
} else {
  console.warn('⚠ Bloque de fecha no encontrado');
}
// Hacemos el reemplazo limpio:
if (xml.includes(' 31 de Julio</w:t></w:r>')) {
  // Reemplazar los dos runs de fecha con uno solo
  const before = '<w:r w:rsidR="001F0349" w:rsidRPr="001F0349"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve"> 31 de Julio</w:t></w:r><w:r w:rsidR="00816475" w:rsidRPr="001F0349"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve"> de 2025, quien </w:t></w:r>';
  const after  = '<w:r><w:rPr>' + sz24 + '</w:rPr><w:t xml:space="preserve"> {{fecha}}, quien </w:t></w:r>';
  xml = xml.replace(before, after);
  count++;
}

// Nombre del solicitante (puntos al final del párrafo 2, después de "suscribe:")
replaceDots('suscribe:</w:t></w:r>', 'nombre_completo', sz24);

// ─── PÁRRAFO 3: Datos personales y comerciales ──────────────

// DNI (después de "DNI Nº")
replaceDots('DNI Nº</w:t></w:r>', 'dni', sz24);

// Domicilio personal: run "en…" + puntos siguientes → "en {{domicilio}} "
replaceMixed('en…', 'en {{domicilio}} ', 'domicilio_skip', sz24);
// Corrección: el var correcto es "domicilio"
xml = xml.replace('en {{domicilio_skip}} </w:t>', 'en {{domicilio}} </w:t>');

// Ciudad personal: run "de…" + puntos siguientes → "de {{ciudad}}"
replaceMixed('de…', 'de {{ciudad}}', 'ciudad_skip', sz24);
xml = xml.replace('de {{ciudad_skip}}</w:t>', 'de {{ciudad}}</w:t>');

// CP personal: run ".…" + puntos siguientes → ". {{cp}}"  (después de "(C.P")
replaceMixed('.…', '. {{cp}}', 'cp_skip', sz24);
xml = xml.replace('. {{cp_skip}}</w:t>', '. {{cp}}</w:t>');

// Provincia: puntos después de "Provincia"
replaceDots('Provincia</w:t></w:r>', 'provincia', sz24);

// Profesión: inline "Profesión……………………."
// Buscar el run que contiene "Profesión" seguido de puntos
{
  const profIdx = xml.indexOf('<w:t>Profesión');
  if (profIdx !== -1) {
    const profEnd = xml.indexOf('</w:t>', profIdx);
    const profContent = xml.substring(profIdx + 5, profEnd); // skip "<w:t>"
    if (/Profesión[….]+/.test(profContent)) {
      const runStart = xml.lastIndexOf('<w:r', profIdx);
      const runEnd   = xml.indexOf('</w:r>', profEnd) + 6;
      const newRun = `<w:r><w:rPr>${sz24}</w:rPr><w:t xml:space="preserve">Profesión {{profesion}}</w:t></w:r>`;
      xml = xml.substring(0, runStart) + newRun + xml.substring(runEnd);
      count++;
    }
  }
}

// CUIL: puntos después de " CUIT " (PRIMERO — mismo patrón que ciudad_comercial)
replaceDots(' CUIT </w:t></w:r>', 'cuil', sz24);

// Domicilio comercial: run de puntos sueltos después de "calle "
// El run es el ÚNICO de 15 puntos que queda en para3 tras reemplazar domicilio personal
replaceDots('calle </w:t></w:r>', 'domicilio_comercial', sz24);

// Ciudad comercial: mismo patrón que CUIL pero segunda ocurrencia
replaceDots('en la ciudad de </w:t></w:r>', 'ciudad_comercial', sz24);

// CP comercial: puntos después de "(C.P" (segunda ocurrencia — la de comercio)
// La primera "(C.P" ya fue reemplazada, así que esta es la que queda
replaceDots('(C.P</w:t></w:r>', 'cp_comercial', sz24);

// Nombre de Fantasía (bold)
{
  // Buscar el run bold con puntos después de "Nombre de Fantasía: "
  const nfIdx = xml.indexOf('Nombre de Fantasía: </w:t></w:r>');
  if (nfIdx !== -1) {
    let pos = nfIdx + 'Nombre de Fantasía: </w:t></w:r>'.length;
    // Saltar espacio opcional
    let mm;
    while ((mm = xml.substring(pos).match(/^<w:r[^>]*><w:rPr>[^<]*<\/w:rPr><w:t xml:space="preserve"> <\/w:t><\/w:r>/))) pos += mm[0].length;
    // Ahora debería haber el run bold con puntos
    if (xml.startsWith('<w:r', pos)) {
      const tOpen  = xml.indexOf('<w:t', pos);
      const tClose = xml.indexOf('>', tOpen) + 1;
      const tEnd   = xml.indexOf('</w:t>', tClose);
      const tc     = xml.substring(tClose, tEnd);
      if (isDot(tc)) {
        const rEnd = xml.indexOf('</w:r>', tEnd) + 6;
        count++;
        xml = xml.substring(0, pos) +
          `<w:r><w:rPr>${bold24}</w:rPr><w:t>{{nombre_comercio}}</w:t></w:r>` +
          xml.substring(rEnd);
      }
    }
  } else { console.warn('⚠ "Nombre de Fantasía:" no encontrado'); }
}

// ─── PÁRRAFO 4: Monto, CBU, Titular, Banco ──────────────────

// Monto: run "$…" + puntos → "${{monto}}"
replaceMixed('$…', '${{monto}}', 'monto_skip', bold24 + '<w:lang w:val="es-AR"/>');
xml = xml.replace('${{monto_skip}}', '${{monto}}');

// Monto en letras: run "Pesos…" + puntos → "Pesos {{monto_letras}}"
replaceMixed('Pesos…', 'Pesos {{monto_letras}}', 'monto_letras_skip', sz24es);
xml = xml.replace('Pesos {{monto_letras_skip}}', 'Pesos {{monto_letras}}');

// CBU/CVU: puntos después de "Nº " (con espacio)
replaceDots('Nº</w:t></w:r>', 'cbu', '<w:b/>');

// Titular: puntos después de "itular " (la T está en el run anterior ", T")
replaceDots('itular </w:t></w:r>', 'nombre_completo', sz24es);

// Banco: run "nombre:…" + puntos → "nombre: {{banco}}"
replaceMixed('nombre:…', 'nombre: {{banco}}', 'banco_skip', sz24es);
xml = xml.replace('nombre: {{banco_skip}}', 'nombre: {{banco}}');

// ─── PÁRRAFO 7: Cuotas ──────────────────────────────────────

// Plazo: reemplazar "60" hardcodeado
xml = xml.replace(
  'el préstamo en 60 cuotas diarias',
  'el préstamo en {{plazo_dias}} cuotas diarias'
);
count++;

// Cuota diaria: puntos después de "de $ "
replaceDots('de $ </w:t></w:r>', 'cuota_diaria', sz24es);

// Cuota diaria en letras: puntos dentro de "(Pesos …)"
replaceDots('(Pesos </w:t></w:r>', 'cuota_diaria_letras', sz24es);

// Primera cuota: "la primera cuota vencerá el día …… de ……"
// El bloque tiene: run de puntos + run " de " + run de puntos
// Usamos ancla "vencerá el día "
{
  const vcIdx = xml.indexOf('vencerá el día </w:t></w:r>');
  if (vcIdx === -1) { console.warn('⚠ "vencerá el día" no encontrado'); }
  else {
    let pos = vcIdx + 'vencerá el día </w:t></w:r>'.length;
    let dotEnd = pos;
    // Primeros runs de puntos (día)
    while (true) {
      let cur = dotEnd;
      let mm;
      while ((mm = xml.substring(cur).match(/^<w:proofErr[^\/]*\/>/))) cur += mm[0].length;
      if (!xml.startsWith('<w:r', cur)) break;
      const tOpen = xml.indexOf('<w:t', cur);
      if (tOpen === -1 || tOpen - cur > 500) break;
      const tClose = xml.indexOf('>', tOpen) + 1;
      const tEnd   = xml.indexOf('</w:t>', tClose);
      const tc     = xml.substring(tClose, tEnd);
      if (!isDot(tc)) break;
      dotEnd = xml.indexOf('</w:r>', tEnd) + 6;
      while ((mm = xml.substring(dotEnd).match(/^<w:proofErr[^\/]*\/>/))) dotEnd += mm[0].length;
    }
    // Run " de "
    const deText = '<w:t xml:space="preserve"> de </w:t></w:r>';
    if (xml.substring(dotEnd).includes(deText.substring(0, 10))) {
      const deIdx = xml.indexOf(deText, dotEnd);
      if (deIdx !== -1 && deIdx - dotEnd < 300) {
        dotEnd = deIdx + deText.length;
      }
    }
    // Segundos runs de puntos (mes/año)
    while (true) {
      let cur = dotEnd;
      let mm;
      while ((mm = xml.substring(cur).match(/^<w:proofErr[^\/]*\/>/))) cur += mm[0].length;
      if (!xml.startsWith('<w:r', cur)) break;
      const tOpen = xml.indexOf('<w:t', cur);
      if (tOpen === -1 || tOpen - cur > 500) break;
      const tClose = xml.indexOf('>', tOpen) + 1;
      const tEnd   = xml.indexOf('</w:t>', tClose);
      const tc     = xml.substring(tClose, tEnd);
      if (!isDot(tc)) break;
      dotEnd = xml.indexOf('</w:r>', tEnd) + 6;
      let mm2;
      while ((mm2 = xml.substring(dotEnd).match(/^<w:proofErr[^\/]*\/>/))) dotEnd += mm2[0].length;
    }
    count++;
    xml = xml.substring(0, pos) +
      makeRun('{{primera_cuota_fecha}}', sz24es) +
      xml.substring(dotEnd);
  }
}

// ─── PÁRRAFO 9: Tasas ───────────────────────────────────────

// TNA: puntos después de "aplicada es del "
replaceDots('aplicada es del </w:t></w:r>', 'tna', sz24es);

// TED: puntos después de "de aproximadamente "
replaceDots('de aproximadamente </w:t></w:r>', 'ted', sz24es);

// TEA: puntos después de "asciende al "
replaceDots('asciende al </w:t></w:r>', 'tea', sz24es);

// CFTEA: inline "es del ……………" en el run largo
{
  const cfIdx = xml.indexOf('es del ');
  if (cfIdx !== -1) {
    const wtStart2 = xml.lastIndexOf('<w:t', cfIdx);
    const wtClose2 = xml.indexOf('>', wtStart2) + 1;
    const wtEnd2   = xml.indexOf('</w:t>', wtClose2);
    const content  = xml.substring(wtClose2, wtEnd2);
    if (/es del [….]+$/.test(content)) {
      const fixedPart = content.replace(/[….]+$/, '');
      const runStart2 = xml.lastIndexOf('<w:r', wtStart2);
      const runEnd2   = xml.indexOf('</w:r>', wtEnd2) + 6;
      const rpr2      = xml.substring(xml.indexOf('<w:rPr>', runStart2) + 7, xml.indexOf('</w:rPr>', runStart2));
      count++;
      xml = xml.substring(0, runStart2) +
        `<w:r><w:rPr>${rpr2}</w:rPr><w:t xml:space="preserve">${fixedPart}{{cftea}}</w:t></w:r>` +
        xml.substring(runEnd2);
    } else { console.warn('⚠ Patrón CFTEA no encontrado en run'); }
  }
}

// ─── Guardar ────────────────────────────────────────────────

zip.file('word/document.xml', xml);
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, out);

console.log(`\n✅ ${count} reemplazos realizados`);
console.log('📄 Guardado en:', OUTPUT);

// Verificar variables
const vars = [
  'fecha','nombre_completo','dni','domicilio','ciudad','cp','provincia','profesion',
  'cuil','domicilio_comercial','ciudad_comercial','cp_comercial','nombre_comercio',
  'monto','monto_letras','cbu','nombre_completo','banco',
  'plazo_dias','cuota_diaria','cuota_diaria_letras','primera_cuota_fecha',
  'tna','ted','tea','cftea',
];
const unique = [...new Set(vars)];
console.log('\nVariables en template:');
unique.forEach(v => {
  const ok = xml.includes(`{{${v}}}`);
  console.log(`  ${ok ? '✓' : '✗'} {{${v}}}`);
});

// Verificar que no quedaron puntos sueltos (posible variable perdida)
const dotRuns = (xml.match(/<w:t[^>]*>[….]{3,}<\/w:t>/g) || []);
if (dotRuns.length > 0) {
  console.log('\n⚠ Runs con puntos sin reemplazar (' + dotRuns.length + '):');
  dotRuns.forEach(r => console.log(' ', r.substring(0, 80)));
}
