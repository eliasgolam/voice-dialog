import { handleUserText } from '../src/dialog/controller';
import { __LLM_DIAGNOSTICS } from '../src/services/llm';

async function run() {
  let pass = true;
  const s = 'verify-llm';
  const out = (label: string, ok: boolean) => { console.log(`${label} ${ok ? 'PASS' : 'FAIL'}`); if (!ok) pass = false; };

  // --- Turn 1 ---
  let asksConfirm = false;
  let toolFirst = false;
  let transportOk = false;
  try {
    const first = await handleUserText('Erstelle einen Rapport für Max morgen 09:00', s);
    asksConfirm = /passt das|bestätigen|soll ich/i.test(first?.text || '');
    transportOk = __LLM_DIAGNOSTICS.transport === 'direct' || __LLM_DIAGNOSTICS.transport === 'proxy';
    toolFirst = (__LLM_DIAGNOSTICS.lastToolCount ?? 0) > 0;
  } catch {
    asksConfirm = false;
    transportOk = false;
    toolFirst = false;
  }
  out('CONFIRM_BEFORE_ACTION', asksConfirm);

  // --- Turn 2 ---
  let doneOk = false;
  let toolSecond = false;
  try {
    const second = await handleUserText('Ja', s);
    doneOk = /erledigt|rapport\s*#\d+/i.test(second?.text || '');
    toolSecond = (__LLM_DIAGNOSTICS.lastToolCount ?? 0) > 0;
  } catch {
    doneOk = false;
    toolSecond = false;
  }
  out('ACTION_RESULT_CONFIRMED', doneOk);

  const toolDetected = toolFirst || toolSecond;
  out('TOOL_CALL_DETECTED', toolDetected);
  out('LLM_TRANSPORT_ACTIVE', transportOk);

  console.log(`OVERALL ${pass ? 'PASS' : 'FAIL'}`);
}

run().catch(() => {
  console.log('OVERALL FAIL');
  process.exit(1);
});

