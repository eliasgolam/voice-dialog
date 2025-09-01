import { handleUserText } from '../src/dialog/controller';
import { resetSession } from '../src/dialog/memory';

async function run() {
  let pass = true;
  const out = (label: string, ok: boolean) => { console.log(`${label} ${ok ? 'PASS' : 'FAIL'}`); if (!ok) pass = false; };

  // RAPPORT_FLOW
  try {
    const s = 'e2e-rapport'; resetSession(s);
    const first = await handleUserText('Erstelle einen Rapport für Max morgen 09:00', s);
    const confirm = /passt das/i.test(first.text || '') || (first as any).suggestions?.includes('Ja');
    const second = await handleUserText('Ja', s);
    const done = /erledigt/i.test(second.text || '') && /rapport/i.test(second.text || '');
    out('RAPPORT_FLOW', confirm && done);
  } catch { out('RAPPORT_FLOW', false); }

  // MATERIAL_SLOTS
  try {
    const s = 'e2e-material'; resetSession(s);
    const first = await handleUserText('Material Schrauben 200 für Max', s);
    const confirm = /passt das/i.test(first.text || '') || (first as any).suggestions?.includes('Ja');
    const second = await handleUserText('Ja', s);
    const done = /erledigt/i.test(second.text || '') && /material/i.test(second.text || '');
    out('MATERIAL_SLOTS', confirm && done);
  } catch { out('MATERIAL_SLOTS', false); }

  // TERMIN_KORREKTUR (Nein -> neue Zeit -> Ja)
  try {
    const s = 'e2e-termin'; resetSession(s);
    const first = await handleUserText('Termin bei Anna am Freitag 14:30 im Büro', s);
    const confirm1 = /passt das/i.test(first.text || '') || (first as any).suggestions?.includes('Ja');
    const corr = await handleUserText('Nein, 15:00', s);
    const confirm2 = ((/passt das/i.test(corr.text || '') || (corr as any).suggestions?.includes('Ja')) && /15:00/.test(corr.text || ''));
    const final = await handleUserText('Ja', s);
    const done = /erledigt/i.test(final.text || '') && /(termin|anna)/i.test(final.text || '');
    out('TERMIN_KORREKTUR', confirm1 && confirm2 && done);
  } catch { out('TERMIN_KORREKTUR', false); }

  // ABBRUCH
  try {
    const s = 'e2e-abort'; resetSession(s);
    await handleUserText('Erstelle einen Rapport für Max', s);
    const res = await handleUserText('Abbrechen', s);
    const ok = /abgebrochen/i.test(res.text || '');
    out('ABBRUCH', ok);
  } catch { out('ABBRUCH', false); }

  // SMALLTALK
  try {
    const s = 'e2e-smalltalk'; resetSession(s);
    const res = await handleUserText('Hallo, wie gehts?', s);
    const ok = /(hallo|wie kann ich helfen|verstand)/i.test(res.text || '');
    out('SMALLTALK', ok);
  } catch { out('SMALLTALK', false); }

  console.log(`OVERALL ${pass ? 'PASS' : 'FAIL'}`);
}

run().catch(() => {
  console.log('OVERALL FAIL');
  process.exit(1);
});


