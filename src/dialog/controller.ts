import { getSession } from './memory';
import { chat, toolSchemasFromFiles, ChatMessage, __LLM_DIAGNOSTICS } from '../services/llm';
import { env } from '../services/config/env';
import { logTurn } from '../services/telemetry';
import { normalizeDateTime } from '../utils/temporal';
import { ActionRegistry } from '../actions/registry';
let cachedSysPrompt = '' as string;

async function getSysPrompt(): Promise<string> {
  if (cachedSysPrompt) return cachedSysPrompt;

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (isBrowser) {
    // Vite/Browser: Raw-Import
    // @ts-ignore
    const mod = await import('./systemPrompt.md?raw');
    cachedSysPrompt = (mod?.default ?? '').toString();
  } else {
    // Node/TSX: Datei lesen
    const fs = await import('fs');
    const path = await import('path');
    cachedSysPrompt = fs.readFileSync(
      path.resolve(__dirname, 'systemPrompt.md'),
      'utf-8'
    );
  }
  return cachedSysPrompt;
}

// Tools laden
import CAP_RAPPORT from '../capabilities/CREATE_RAPPORT.json';
import CAP_CUSTOMER from '../capabilities/CREATE_CUSTOMER.json';
import CAP_MATERIAL from '../capabilities/ADD_MATERIAL.json';
import CAP_APPT from '../capabilities/SET_APPOINTMENT.json';

const toolSchemas = toolSchemasFromFiles([CAP_RAPPORT as any, CAP_CUSTOMER as any, CAP_MATERIAL as any, CAP_APPT as any]);

function looksLikeYes(txt: string) {
  return /\b(ja|passt|bestätige|okay|ok)\b/i.test(txt.trim());
}
function looksLikeNo(txt: string) {
  return /\b(nein|nope|nicht)\b/i.test(txt.trim());
}
function looksLikeCancel(txt: string) {
  return /\b(abbrechen|abbruch|stop|cancel)\b/i.test((txt||'').trim());
}

function inferActionFromHistory(history: Array<{ role: string; content?: string }>) {
  const priorUser = [...history]
    .reverse()
    .find(m => m.role === 'user' && !/^\s*(ja|nein|nope|okay|ok)\b/i.test(m.content || ''))
    ?.content || '';
  const txt = priorUser;
  // Rapport
  if (/(rapport|tagesrapport|report)/i.test(txt)) {
    const kunde = (txt.match(/für\s+([A-ZÄÖÜa-zäöüß][\wÄÖÜäöüß'-]*(?:\s+[A-ZÄÖÜa-zäöüß][\wÄÖÜäöüß'-]*)?)/i)?.[1] || '').trim() || undefined;
    const zeit = txt.match(/\b(\d{1,2}:\d{2})\b/)?.[1];
    const datum = txt.match(/\b(\d{4}-\d{2}-\d{2}|heute|morgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i)?.[1];
    return { name: 'CREATE_RAPPORT', params: { kunde, zeit, datum } };
  }
  // Termin
  if (/(termin|kalender|meeting)/i.test(txt)) {
    const kunde = (txt.match(/(?:bei|mit)\s+([A-ZÄÖÜa-zäöüß][\wÄÖÜäöüß'-]*)/i)?.[1] || '').trim() || undefined;
    const zeit = txt.match(/\b(\d{1,2}:\d{2})\b/)?.[1];
    const datum = txt.match(/\b(\d{4}-\d{2}-\d{2}|heute|morgen|freitag|montag|dienstag|mittwoch|donnerstag|samstag|sonntag)\b/i)?.[1];
    const ort = txt.match(/\b(?:im|in\s+der|in)\s+([A-Za-zÄÖÜäöüß\- ]+)\b/)?.[1];
    return { name: 'SET_APPOINTMENT', params: { kunde, zeit, datum, ort } };
  }
  // Material
  if (/(material|schrauben|dübel|kabel|leitung|rohr|artikel)/i.test(txt)) {
    const kunde = (txt.match(/für\s+([A-ZÄÖÜa-zäöüß][\wÄÖÜäöüß'-]*)/i)?.[1] || '').trim() || undefined;
    const mengeStr = txt.match(/\b(\d+(?:[.,]\d+)?)\b/)?.[1];
    const menge = mengeStr ? Number(mengeStr.replace(',', '.')) : undefined;
    const artikel = (txt.match(/material\s+([A-Za-zÄÖÜäöüß0-9\- ]+)/i)?.[1] || txt.match(/\b(schrauben|dübel|kabel|leitung|rohr)\b/i)?.[1]) || undefined;
    return { name: 'ADD_MATERIAL', params: { kunde, artikel, menge } };
  }
  // Kunde
  if (/(kunde|kundendossier|kundenakte|kundenmappe)/i.test(txt)) {
    const m = txt.match(/(?:für|von)\s+([A-ZÄÖÜa-zäöüß][\wÄÖÜäöüß'-]+)\s+([A-ZÄÖÜa-zäöüß][\wÄÖÜäöüß'-]+)/);
    const firstName = m?.[1]; const lastName = m?.[2];
    return { name: 'CREATE_CUSTOMER', params: { firstName, lastName } };
  }
  return null;
}

function parseFromAssistantConfirm(text: string): { action?: 'CREATE_RAPPORT'|'ADD_MATERIAL'|'SET_APPOINTMENT'|'CREATE_CUSTOMER'; params: any } | null {
  const t = text || '';
  let m = t.match(/Rapport\s+für\s+([^\s.]+)(?:\s+am\s+([^\s.]+))?(?:\s+um\s+(\d{1,2}:\d{2}))?/i);
  if (m) return { action: 'CREATE_RAPPORT', params: { kunde: m[1], datum: m[2], zeit: m[3] } };
  m = t.match(/Material\s+„([^”]+)“\s*\(([^)]+)\)\s+für\s+([^\.]+)\.?/i);
  if (m) {
    const mengeNum = Number(String(m[2]).replace(/,/, '.'));
    return { action: 'ADD_MATERIAL', params: { artikel: m[1], menge: isNaN(mengeNum) ? m[2] : mengeNum, kunde: m[3].trim() } };
  }
  m = t.match(/Termin\s+für\s+([^\s.]+)(?:\s+am\s+([^\s.]+))?(?:\s+um\s+(\d{1,2}:\d{2}))?(?:\s*(?:@\s*|im\s+|in\s+der\s+|in\s+)([^\.]+))?/i);
  if (m) return { action: 'SET_APPOINTMENT', params: { kunde: m[1], datum: m[2], zeit: m[3], ort: m[4]?.trim() } };
  m = t.match(/Kundendossier\s+für\s+([A-Za-zÄÖÜäöüß'-]+)\s+([A-Za-zÄÖÜäöüß'-]+)/i);
  if (m) return { action: 'CREATE_CUSTOMER', params: { firstName: m[1], lastName: m[2] } };
  return null;
}

function applyCorrectionToParams(correction: string, action: 'CREATE_RAPPORT'|'ADD_MATERIAL'|'SET_APPOINTMENT'|'CREATE_CUSTOMER', params: any): any {
  const time = correction.match(/(\d{1,2}:\d{2})/);
  if (time) params.zeit = time[1];
  const dateWord = correction.match(/\b(heute|morgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|\d{4}-\d{2}-\d{2})\b/i);
  if (dateWord) params.datum = dateWord[1];
  const place = correction.match(/\b(?:im|in\s+der|in)\s+([A-Za-zÄÖÜäöüß\- ]+)\b/i);
  if (place) params.ort = place[1];
  if (action === 'ADD_MATERIAL') {
    const mengeStr = correction.match(/\b(\d+(?:[.,]\d+)?)\b/);
    if (mengeStr) params.menge = Number(mengeStr[1].replace(',', '.'));
    const art = correction.match(/\b(schrauben|dübel|kabel|leitung|rohr|[A-Za-zÄÖÜäöüß0-9\-]+)/i);
    if (art) params.artikel = art[1];
  }
  return params;
}

function buildConfirmFromAction(action: 'CREATE_RAPPORT'|'ADD_MATERIAL'|'SET_APPOINTMENT'|'CREATE_CUSTOMER', params: any): string {
  switch (action) {
    case 'CREATE_RAPPORT': {
      const kunde = params?.kunde ?? 'Kunde';
      const datum = params?.datum ? ` am ${params.datum}` : '';
      const zeit  = params?.zeit  ? ` um ${params.zeit}`  : '';
      return `Ich erstelle den Rapport für ${kunde}${datum}${zeit}. Passt das?`;
    }
    case 'ADD_MATERIAL': {
      const artikel = params?.artikel ?? 'Material';
      const menge   = params?.menge ?? '?';
      const kunde   = params?.kunde ?? 'Kunde';
      return `Ich erfasse Material „${artikel}“ (${menge}) für ${kunde}. Passt das?`;
    }
    case 'SET_APPOINTMENT': {
      const kunde = params?.kunde ?? 'Kunde';
      const datum = params?.datum ? ` am ${params.datum}` : '';
      const zeit  = params?.zeit  ? ` um ${params.zeit}`  : '';
      const ort   = params?.ort   ? ` @ ${params.ort}`    : '';
      return `Ich vereinbare den Termin für ${kunde}${datum}${zeit}${ort}. Passt das?`;
    }
    case 'CREATE_CUSTOMER': {
      const fn = params?.firstName ?? 'Vorname';
      const ln = params?.lastName ?? 'Nachname';
      return `Ich lege das Kundendossier für ${fn} ${ln} an. Passt das?`;
    }
  }
}

async function finalizeWithAction(actionName: string, params: any, session: { history: Array<{ role: string; content?: string }>, executed?: Set<string> }) {
  if (actionName === 'CREATE_RAPPORT' || actionName === 'SET_APPOINTMENT') {
    params = { ...params, ...normalizeDateTime(params) };
  }
  const rid = JSON.stringify({ action: actionName, params });
  if (session.executed && session.executed.has(rid)) {
    const already = 'Erledigt. (bereits ausgeführt)';
    session.history.push({ role:'assistant', content: already } as any);
    return { text: already };
  }
  const result = await ActionRegistry.execute(actionName as any, params || {});
  const id = (result && typeof (result as any).id !== 'undefined') ? (result as any).id : Date.now();
  __LLM_DIAGNOSTICS.lastToolCount = 1;
  session.history.push({ role: 'tool', content: JSON.stringify(result), name: actionName, tool_call_id: 'synthetic' } as any);
  let finalText = '';
  if ((result as any)?.message) {
    finalText = `Erledigt. ${(result as any).message}`;
  } else {
    switch (actionName) {
      case 'CREATE_RAPPORT': {
        const kunde = params?.kunde ?? 'Kunde';
        finalText = `Erledigt. Rapport #${id} für ${kunde} angelegt.`; break;
      }
      case 'CREATE_CUSTOMER': {
        const name = [params?.firstName, params?.lastName].filter(Boolean).join(' ') || 'Kunde';
        finalText = `Erledigt. Kundendossier #${id} für ${name} angelegt.`; break;
      }
      case 'ADD_MATERIAL': {
        const artikel = params?.artikel ?? 'Material';
        const menge = params?.menge ?? '?';
        const kunde = params?.kunde ?? 'Kunde';
        finalText = `Erledigt. Material „${artikel}“ (${menge}) für ${kunde} erfasst.`; break;
      }
      case 'SET_APPOINTMENT': {
        const kunde = params?.kunde ?? 'Kunde';
        const datum = params?.datum ? ` am ${params.datum}` : '';
        const zeit = params?.zeit ? ` um ${params.zeit}` : '';
        const ort  = params?.ort ? ` @ ${params.ort}` : '';
        finalText = `Erledigt. Termin #${id} für ${kunde}${datum}${zeit}${ort}.`; break;
      }
      default:
        finalText = `Erledigt. Aktion #${id} ausgeführt.`;
    }
  }
  session.history.push({ role: 'assistant', content: finalText } as any);
  if (session.executed) session.executed.add(rid);
  return { text: finalText };
}

export async function handleUserText(text: string, sessionId: string): Promise<{ text: string; suggestions?: string[] }> {
  const FIELD_LABELS: Record<string,string> = {
    firstName: 'Vorname',
    lastName: 'Nachname',
    kunde: 'Kunde',
    artikel: 'Artikel',
    menge: 'Menge',
    datum: 'Datum',
    zeit: 'Zeit',
    ort: 'Ort',
    projekt: 'Projekt',
  };
  if (looksLikeCancel(text)) {
    const s0 = getSession(sessionId);
    s0.pendingAction = null;
    s0.history.push({ role:'user', content:text } as any);
    const msg = 'Okay, abgebrochen.';
    s0.history.push({ role:'assistant', content: msg } as any);
    return { text: msg };
  }
  const s = getSession(sessionId);
  if (s.history.length === 0) {
    const sys = await getSysPrompt();
    s.history.push({ role: 'system', content: sys });
  }
  // Handle NEGATIVE correction like "Nein, 15:00" by updating last confirm deterministically
  if (looksLikeNo(text)) {
    const lastAssistant = [...s.history].reverse().find(m => m.role === 'assistant') as any;
    if (lastAssistant?.content) {
      const parsed = parseFromAssistantConfirm(String(lastAssistant.content));
      if (parsed?.action) {
        const updated = applyCorrectionToParams(text, parsed.action, { ...(parsed.params || {}) });
        const confirm = buildConfirmFromAction(parsed.action, updated);
        (s as any).pendingAction = { name: parsed.action, params: updated };
        s.history.push({ role: 'user', content: text });
        s.history.push({ role: 'assistant', content: confirm });
        return { text: confirm, suggestions: ['Ja','Nein','Abbrechen'] };
      }
      // Fallback: infer from last substantive user message and apply correction
      const inferred = inferActionFromHistory(s.history as any);
      if (inferred?.name === 'SET_APPOINTMENT') {
        const updated = applyCorrectionToParams(text, 'SET_APPOINTMENT', { ...(inferred.params || {}) });
        const confirm = buildConfirmFromAction('SET_APPOINTMENT', updated);
        (s as any).pendingAction = { name: 'SET_APPOINTMENT', params: updated } as any;
        s.history.push({ role: 'user', content: text });
        s.history.push({ role: 'assistant', content: confirm });
        return { text: confirm, suggestions: ['Ja','Nein','Abbrechen'] };
      }
    }
  }
  // Early deterministic confirm path (no extra LLM): if user confirms now, infer and execute immediately
  if (looksLikeYes(text)) {
    const inferredEarly = inferActionFromHistory(s.history as any);
    if (inferredEarly?.name) {
      s.history.push({ role: 'user', content: text });
      return await finalizeWithAction(inferredEarly.name as any, inferredEarly.params, s as any);
    }
  }
  s.history.push({ role: 'user', content: text });
  // 1) Normaler LLM-Call
  let first: any;
  try {
    first = await chat(s.history as any, toolSchemas);
  } catch (e) {
    const friendly = 'Es gab gerade ein Problem mit dem KI-Dienst. Ich versuche es erneut oder du kannst mit „Ja“ bestätigen, dann führe ich es direkt aus.';
    s.history.push({ role:'assistant', content: friendly } as any);
    return { text: friendly, suggestions: ['Ja','Abbrechen'] };
  }

  // Wenn das LLM sofort Tool-Calls liefert → ausführen und Abschluss holen
  if (first.tool_calls && first.tool_calls.length > 0) {
    for (const tc of first.tool_calls) {
      const name = tc.function?.name;
      let args: any = {};
      try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}
      const result = await ActionRegistry.execute(name, args);
      s.history.push({ role:'tool', name, tool_call_id: tc.id, content: JSON.stringify(result) });
    }
    let second: any;
    try {
      second = await chat(s.history as any, toolSchemas);
    } catch (e) {
      const friendly = 'Es gab gerade ein Problem mit dem KI-Dienst. Du kannst mit „Ja“ bestätigen – ich führe es direkt aus.';
      s.history.push({ role:'assistant', content: friendly } as any);
      return { text: friendly, suggestions: ['Ja','Abbrechen'] };
    }
    s.history.push({ role:'assistant', content: second.content });
    return { text: second.content };
  }

  // 2) Kein Tool-Call: Rückfrage/Bestätigung – ggf. Force-Call bei Bestätigung
  const firstText = String(first.content || '');
  let suggest = /\b(passt das|bestätigen|soll ich)\b/i.test(firstText) ? ['Ja','Nein','Abbrechen'] : undefined;
  // Falls LLM keinen Confirm lieferte, versuche Confirm aus inferierter Action zu bauen
  if (!suggest) {
    const inferredFromText = inferActionFromHistory(s.history as any) || inferActionFromHistory([{ role:'user', content: text } as any]);
    if (inferredFromText?.name) {
      // PRE-VALIDATE before confirm → ask missing first
      const pre = ActionRegistry.validate(inferredFromText.name as any, inferredFromText.params || {});
      if (!pre.ok && pre.missing.length) {
        (s as any).pendingAction = { name: inferredFromText.name as any, params: inferredFromText.params } as any;
        (s as any).pendingMissing = pre.missing.slice();
        const human = pre.missing.map(k => FIELD_LABELS[k] || k).join('/');
        const ask = `Es fehlen Pflichtangaben (${human}). Was soll ich eintragen?`;
        return { text: ask, suggestions: ['Abbrechen'] };
      }
      const confirm = buildConfirmFromAction(inferredFromText.name as any, inferredFromText.params);
      s.history.push({ role:'assistant', content: confirm });
      return { text: confirm, suggestions: ['Ja','Nein','Abbrechen'] };
    }
  }

  if (looksLikeYes(text)) {
    if ((s as any).pendingAction) {
      const pa = (s as any).pendingAction;
      s.history.push({ role: 'user', content: text });
      // LLM-first: function call only
      if (env.forceExecuteOnYes === false) {
        s.history.push({ role: 'system', content: 'Der Nutzer hat bestätigt. Antworte jetzt ausschließlich mit einem function call, kein Fließtext.' } as any);
        const forced = await chat(s.history as any, toolSchemas);
        if (forced.tool_calls && forced.tool_calls.length > 0) {
          for (const tc of forced.tool_calls) {
            const name = tc.function?.name;
            let args: any = {};
            try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}
            const result = await ActionRegistry.execute(name as any, Object.keys(args).length ? args : pa.params);
            s.history.push({ role: 'tool', name: name as any, tool_call_id: tc.id, content: JSON.stringify(result) } as any);
          }
          const t0 = Date.now();
          const final = await chat(s.history as any, toolSchemas);
          logTurn({ sessionId, phase: 'execute', origin: 'llm', action: String(name || pa.name), durationMs: Date.now()-t0 });
          (s as any).pendingAction = null;
          s.history.push({ role: 'assistant', content: final.content } as any);
          return { text: final.content };
        }
      }
      // Fallback deterministic
      (s as any).pendingAction = null;
      const t0 = Date.now();
      const res = await finalizeWithAction(pa.name, pa.params, s as any);
      logTurn({ sessionId, phase: 'execute', origin: 'fallback', action: pa.name, durationMs: Date.now()-t0 });
      return res;
    }
    // prefer parse from last assistant confirm, fallback to history inference
    const lastAssistant = [...s.history].reverse().find(m => m.role === 'assistant') as any;
    const parsed = lastAssistant?.content ? parseFromAssistantConfirm(String(lastAssistant.content)) : null;
    const inferred = parsed || inferActionFromHistory(s.history as any);
    if (inferred?.action) {
      s.history.push({ role:'user', content: text });
      const exec = await ActionRegistry.execute(inferred.action as any, inferred.params);
      if (exec && (exec as any).ok === false && (exec as any).error === 'validation') {
        const det = String((exec as any).details || '').toLowerCase();
        const fields: string[] = [];
        const pushIf = (k:string)=>{ if(det.includes(k)) fields.push(k); };
        pushIf('firstName'.toLowerCase()); pushIf('lastName'.toLowerCase());
        pushIf('kunde'); pushIf('artikel'); pushIf('menge'); pushIf('datum'); pushIf('zeit'); pushIf('projekt');
        const ask = fields.length > 0 ? `Es fehlen Pflichtangaben (${fields.join('/')}). Was soll ich eintragen?` : 'Welche Angaben fehlen noch?';
        (s as any).pendingAction = { name: inferred.action as any, params: inferred.params } as any;
        (s as any).pendingMissing = fields.slice();
        return { text: ask, suggestions: ['Abbrechen'] };
      }
      // If validation passes, finalize deterministically
      const t0 = Date.now();
      const res = await finalizeWithAction(inferred.action as any, inferred.params, s as any);
      logTurn({ sessionId, phase: 'execute', origin: 'fallback', action: inferred.action as any, durationMs: Date.now()-t0 });
      return res;
    }
    s.history.push({ role:'assistant', content: firstText });
    return { text: firstText, suggestions: suggest };
  }
  // Fill pending missing slots
  if ((s as any).pendingMissing?.length) {
    const slot = (s as any).pendingMissing.shift();
    if ((s as any).pendingAction) {
      (s as any).pendingAction.params[slot] = text.trim();
      if ((s as any).pendingMissing.length) {
        const humanNext = (s as any).pendingMissing.map((k:string)=>FIELD_LABELS[k]||k).join('/');
        const askNext = `Noch fehlt: ${humanNext}.`;
        return { text: askNext, suggestions: ['Abbrechen'] };
      }
      const pa = (s as any).pendingAction;
      const confirm = buildConfirmFromAction(pa.name as any, pa.params);
      return { text: confirm, suggestions: ['Ja','Nein','Abbrechen'] };
    }
  }

  s.history.push({ role:'assistant', content: firstText });
  return { text: firstText, suggestions: suggest };
}


