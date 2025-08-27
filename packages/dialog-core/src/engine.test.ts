import { describe, it, expect } from 'vitest';
import { DialogEngine } from './engine';
import type { EngineEvent } from './types';

describe('Engine flows', () => {
  it('happy path create_customer', () => {
    const e = new DialogEngine();
    let r = e.dispatch({ type: 'USER_TEXT', text: 'kunde anlegen' });
    expect(r.turn?.text.toLowerCase()).toContain('vorname');
    r = e.dispatch({ type: 'USER_TEXT', text: 'Max' });
    expect(r.turn?.text.toLowerCase()).toContain('nachname');
    r = e.dispatch({ type: 'USER_TEXT', text: 'Muster' });
    r = e.dispatch({ type: 'USER_TEXT', text: 'Musterstrasse 1' });
    r = e.dispatch({ type: 'USER_TEXT', text: '076 111 22 33' });
    r = e.dispatch({ type: 'USER_TEXT', text: 'max@example.com' });
    r = e.dispatch({ type: 'USER_TEXT', text: 'ja' });
    expect(r.turn?.text.toLowerCase()).toContain('kundendossier');
  });

  it('rejects invalid email then accepts', () => {
    const e = new DialogEngine();
    e.dispatch({ type: 'USER_TEXT', text: 'kunde anlegen' });
    e.dispatch({ type: 'USER_TEXT', text: 'Max' });
    e.dispatch({ type: 'USER_TEXT', text: 'Muster' });
    e.dispatch({ type: 'USER_TEXT', text: 'Musterstrasse' });
    e.dispatch({ type: 'USER_TEXT', text: '076 111 22 33' });
    let r = e.dispatch({ type: 'USER_TEXT', text: 'not-an-email' });
    expect(r.turn?.text.toLowerCase()).toContain('e-mail');
    r = e.dispatch({ type: 'USER_TEXT', text: 'valid@mail.com' });
    expect(r.turn?.text.toLowerCase()).toMatch(/projekt|ja|nein/);
  });

  it('invoice happy path', () => {
    const e = new DialogEngine();
    let r = e.dispatch({ type: 'USER_TEXT', text: 'rechnung erstellen' });
    expect(r.turn?.text.toLowerCase()).toContain('projekt');
    r = e.dispatch({ type: 'USER_TEXT', text: 'Umbau Garten' });
    expect(r.turn?.text.toLowerCase()).toContain('umbau garten');
  });

  it('rapport first 3 prompts come in order', () => {
    const e = new DialogEngine();
    let r = e.dispatch({ type: 'USER_TEXT', text: 'rapport' });
    expect(r.turn?.text.toLowerCase()).toContain('projektname');
    r = e.dispatch({ type: 'USER_TEXT', text: 'Projekt A' });
    expect(r.turn?.text.toLowerCase()).toContain('mitarbeitername');
    r = e.dispatch({ type: 'USER_TEXT', text: 'Max' });
    expect(r.turn?.text.toLowerCase()).toContain('heutiges datum');
  });

  it('events fired for create_customer flow', () => {
    const e = new DialogEngine();
    const counts: Record<string, number> = {};
    const add = (evs: EngineEvent[]) => evs.forEach(ev => { counts[ev.type] = (counts[ev.type] || 0) + 1; });

    let r = e.dispatch({ type: 'USER_TEXT', text: 'kunde anlegen' });
    add(r.events);
    r = e.dispatch({ type: 'USER_TEXT', text: 'Max' });
    add(r.events);
    r = e.dispatch({ type: 'USER_TEXT', text: 'Muster' });
    add(r.events);
    r = e.dispatch({ type: 'USER_TEXT', text: 'Musterstrasse 1' });
    add(r.events);
    r = e.dispatch({ type: 'USER_TEXT', text: '076 111 22 33' });
    add(r.events);
    r = e.dispatch({ type: 'USER_TEXT', text: 'valid@mail.com' });
    add(r.events);
    r = e.dispatch({ type: 'USER_TEXT', text: 'ja' });
    add(r.events);

    expect(counts['FLOW_STARTED']).toBe(1);
    expect(counts['STEP_PROMPT']).toBe(6);
    expect(counts['STEP_VALID']).toBe(6);
    expect(counts['FLOW_COMPLETED']).toBe(1);
    expect(counts['ASSISTANT_REPLY']).toBe(7);
  });

  it('invoice: empty project retries then accepts', () => {
    const e = new DialogEngine();
    let r = e.dispatch({ type: 'USER_TEXT', text: 'rechnung' });
    expect(r.turn?.text.toLowerCase()).toContain('projekt');
    r = e.dispatch({ type: 'USER_TEXT', text: '   ' });
    expect(r.turn?.text.toLowerCase()).toContain('projekt');
    r = e.dispatch({ type: 'USER_TEXT', text: 'Projekt X' });
    expect(r.turn?.text.toLowerCase()).toContain('projekt x');
  });

  it('rapport: accepts dd.mm.yyyy and normalizes', () => {
    const e = new DialogEngine();
    e.dispatch({ type: 'USER_TEXT', text: 'rapport' });
    e.dispatch({ type: 'USER_TEXT', text: 'A' });
    e.dispatch({ type: 'USER_TEXT', text: 'B' });
    // dd.mm.yyyy should be accepted and move to next prompt (locationWeather)
    const r = e.dispatch({ type: 'USER_TEXT', text: '31.01.2025' });
    expect(r.turn?.text.toLowerCase()).toContain('wo hast du heute gearbeitet');
  });

  it('hasProject mapping j/n/yes/no accepted', () => {
    const e = new DialogEngine();
    e.dispatch({ type: 'USER_TEXT', text: 'kunde anlegen' });
    e.dispatch({ type: 'USER_TEXT', text: 'Max' });
    e.dispatch({ type: 'USER_TEXT', text: 'Muster' });
    e.dispatch({ type: 'USER_TEXT', text: 'Adr' });
    e.dispatch({ type: 'USER_TEXT', text: '+41 76 000 00 00' });
    e.dispatch({ type: 'USER_TEXT', text: 'a@b.ch' });
    let r = e.dispatch({ type: 'USER_TEXT', text: 'j' });
    expect(r.turn?.text.toLowerCase()).toContain('kundendossier');

    const e2 = new DialogEngine();
    e2.dispatch({ type: 'USER_TEXT', text: 'kunde anlegen' });
    e2.dispatch({ type: 'USER_TEXT', text: 'Max' });
    e2.dispatch({ type: 'USER_TEXT', text: 'Muster' });
    e2.dispatch({ type: 'USER_TEXT', text: 'Adr' });
    e2.dispatch({ type: 'USER_TEXT', text: '+41 76 000 00 00' });
    e2.dispatch({ type: 'USER_TEXT', text: 'a@b.ch' });
    r = e2.dispatch({ type: 'USER_TEXT', text: 'no' });
    expect(r.turn?.text.toLowerCase()).toContain('kundendossier');
  });

  it('smalltalk: greeting responds with time-appropriate salutation', () => {
    const e = new DialogEngine();
    const r = e.dispatch({ type: 'USER_TEXT', text: 'hallo' });
    expect(r.turn?.text.toLowerCase()).toMatch(/hallo|guten morgen|guten tag|guten abend/);
  });

  it('smalltalk: capabilities lists known flows', () => {
    const e = new DialogEngine();
    const r = e.dispatch({ type: 'USER_TEXT', text: 'was kannst du alles?' });
    const txt = r.turn?.text.toLowerCase() || '';
    expect(txt).toContain('kundendossier');
    expect(txt).toContain('rechnung');
    expect(txt).toContain('rapport');
  });
});


