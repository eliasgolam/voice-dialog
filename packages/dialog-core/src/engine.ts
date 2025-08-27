import { flows, FlowDef } from './flows';
import { z } from 'zod';
import { EngineDispatch, EngineEvent, EngineResult, Turn } from './types';
import { logEvent } from './telemetry';

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateInput(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (t === 'heute' || t === 'today') {
    return toIsoDate(new Date());
  }
  if (t === 'gestern' || t === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toIsoDate(d);
  }
  if (t === 'morgen' || t === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }
  // dd.mm.yyyy | dd/mm/yyyy | dd-mm-yyyy
  let m = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) return toIsoDate(d);
  }
  // yyyy.mm.dd | yyyy/mm/dd | yyyy-mm-dd (already valid but normalize separators)
  m = t.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) return toIsoDate(d);
  }
  return null;
}

function timeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return 'Guten Morgen';
  if (hour >= 11 && hour < 17) return 'Guten Tag';
  if (hour >= 17 && hour < 22) return 'Guten Abend';
  return 'Hallo';
}

function detectSmalltalk(text: string): string | null {
  const t = text.toLowerCase();
  // Greetings
  if (/\b(hallo|hi|hey|servus|grüezi|gruezi|moin|guten\s+(morgen|tag|abend))\b/.test(t)) {
    return `${timeOfDayGreeting()}! Wie kann ich helfen?`;
  }
  // How are you
  if (/(wie\s+geht'?s|wie\s+geht\s+es|alles\s+gut)/.test(t)) {
    return "Mir geht's gut, danke! Wie kann ich helfen?";
  }
  // Capabilities / help
  if (/(was\s+kannst\s+du(\s+alles)?|hilfe|help|wobei\s+kannst\s+du\s+helfen)/.test(t)) {
    const flowLabels: Record<string, string> = {
      create_customer: 'Kundendossier anlegen',
      invoice: 'Rechnung erstellen',
      rapport: 'Rapport erfassen',
    };
    const capabilities = flows.map(f => flowLabels[f.id] ?? f.id).join(', ');
    return `Ich kann aktuell: ${capabilities}. Sag z. B. "Kundendossier anlegen", "Rechnung" oder "Rapport".`;
  }
  return null;
}

type Active = { flow: FlowDef; idx: number; filled: Record<string, unknown> } | null;

export class DialogEngine {
  private active: Active = null;

  getContext(): { activeFlowId: string | null; currentSlotId: string | null; filled: Record<string, unknown> } {
    if (!this.active) return { activeFlowId: null, currentSlotId: null, filled: {} };
    const { flow, idx, filled } = this.active;
    const currentSlotId = flow.slots[idx]?.id ?? null;
    return { activeFlowId: flow.id, currentSlotId, filled: { ...filled } };
  }

  private detectFlow(text: string): FlowDef | null {
    for (const f of flows) {
      if (f.intentPatterns.some((r) => r.test(text))) return f;
    }
    return null;
  }

  dispatch(event: EngineDispatch): EngineResult {
    if (event.type !== 'USER_TEXT') return { events: [] };
    const text = event.text.replace(/\s+/g, ' ').trim();
    const events: EngineEvent[] = [];

    if (!this.active) {
      const f = this.detectFlow(text);
      if (!f) {
        const small = detectSmalltalk(text) ?? 'Verstanden. Wie kann ich helfen?';
        const t: Turn = { role: 'assistant', text: small };
        events.push({ type: 'ASSISTANT_REPLY', text: t.text });
        return { turn: t, events };
      }
      this.active = { flow: f, idx: 0, filled: {} };
      const ev1: EngineEvent = { type: 'FLOW_STARTED', flowId: f.id };
      events.push(ev1); logEvent(ev1);
      const ev2: EngineEvent = { type: 'STEP_PROMPT', flowId: f.id, stepId: f.slots[0].id, prompt: f.slots[0].prompt };
      events.push(ev2); logEvent(ev2);
      const t: Turn = { role: 'assistant', text: f.slots[0].prompt };
      const ev3: EngineEvent = { type: 'ASSISTANT_REPLY', text: t.text };
      events.push(ev3); logEvent(ev3);
      return { turn: t, events };
    }

    // active flow: validate current slot
    const { flow, idx, filled } = this.active;
    const slot = flow.slots[idx];
    const schema: z.ZodTypeAny = slot.schema;
    let candidate: unknown = text;
    if (slot.id === 'hasProject') {
      const t = text.toLowerCase();
      if (/(^ja$|^j$|^yes$)/i.test(t)) candidate = 'ja';
      else if (/(^nein$|^n$|^no$)/i.test(t)) candidate = 'nein';
    }
    if (slot.id === 'date') {
      const normalized = normalizeDateInput(text);
      if (normalized) candidate = normalized;
    }
    const res = schema.safeParse(candidate);
    if (!res.success) {
      const prompt = slot.prompt;
      const ev: EngineEvent = { type: 'STEP_INVALID', flowId: flow.id, stepId: slot.id, error: res.error.message, prompt } as EngineEvent;
      events.push(ev); logEvent(ev);
      const t: Turn = { role: 'assistant', text: prompt };
      const ev2: EngineEvent = { type: 'ASSISTANT_REPLY', text: t.text };
      events.push(ev2); logEvent(ev2);
      return { turn: t, events };
    }
    filled[slot.id] = res.data;
    const evValid: EngineEvent = { type: 'STEP_VALID', flowId: flow.id, stepId: slot.id, value: res.data } as EngineEvent;
    events.push(evValid); logEvent(evValid);

    if (idx + 1 < flow.slots.length) {
      this.active = { flow, idx: idx + 1, filled };
      const next = flow.slots[idx + 1];
      const evNext: EngineEvent = { type: 'STEP_PROMPT', flowId: flow.id, stepId: next.id, prompt: next.prompt };
      events.push(evNext); logEvent(evNext);
      const t: Turn = { role: 'assistant', text: next.prompt };
      const evReply: EngineEvent = { type: 'ASSISTANT_REPLY', text: t.text };
      events.push(evReply); logEvent(evReply);
      return { turn: t, events };
    }

    // completed
    const summary = flow.summarize(filled);
    const evDone: EngineEvent = { type: 'FLOW_COMPLETED', flowId: flow.id, summary };
    events.push(evDone); logEvent(evDone);
    const t: Turn = { role: 'assistant', text: summary };
    this.active = null;
    const evReply2: EngineEvent = { type: 'ASSISTANT_REPLY', text: t.text };
    events.push(evReply2); logEvent(evReply2);
    return { turn: t, events };
  }
}


