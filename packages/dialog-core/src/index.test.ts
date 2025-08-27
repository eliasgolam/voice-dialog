import { describe, it, expect } from 'vitest';
import { DialogEngine } from './engine';

describe('DialogEngine', () => {
  it('asks for name first', () => {
    const de = new DialogEngine();
    const r = de.dispatch({ type: 'USER_TEXT', text: 'kunde anlegen' });
    expect(r.turn?.text.toLowerCase()).toContain('vorname');
  });

  it('then asks for address', () => {
    const de = new DialogEngine();
    de.dispatch({ type: 'USER_TEXT', text: 'kunde anlegen' });
    de.dispatch({ type: 'USER_TEXT', text: 'Max' });
    const r = de.dispatch({ type: 'USER_TEXT', text: 'Muster' });
    expect(r.turn?.text.toLowerCase()).toContain('adresse');
  });

  it('gives summary when both known', () => {
    const de = new DialogEngine();
    de.dispatch({ type: 'USER_TEXT', text: 'kunde anlegen' });
    de.dispatch({ type: 'USER_TEXT', text: 'Max' });
    de.dispatch({ type: 'USER_TEXT', text: 'Muster' });
    de.dispatch({ type: 'USER_TEXT', text: 'Musterstrasse 1' });
    de.dispatch({ type: 'USER_TEXT', text: '+41 76 000 00 00' });
    let r = de.dispatch({ type: 'USER_TEXT', text: 'not@mail' });
    expect(r.turn?.text.toLowerCase()).toContain('e-mail');
    r = de.dispatch({ type: 'USER_TEXT', text: 'a@b.ch' });
    r = de.dispatch({ type: 'USER_TEXT', text: 'ja' });
    expect(r.turn?.text.toLowerCase()).toContain('kundendossier');
  });
});


