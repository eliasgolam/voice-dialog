import { describe, it, expect } from '@jest/globals';
import { nlu } from '../services/nlu';

describe('NLU flow: CREATE_CUSTOMER', () => {
  it('erkennt Intent bei "erstelle kundendossier"', async () => {
    const res = await nlu('erstelle kundendossier');
    expect(res.tool?.name).toBe('CREATE_CUSTOMER');
  });

  it('fragt fehlenden Nachnamen nach, wenn nur Vorname gegeben ist', async () => {
    const res = await nlu('erstelle kundendossier vorname Max');
    expect(res.needFollowup).toBe(true);
    expect(res.reply.toLowerCase()).toContain('nachname');
    expect(res.tool?.name).toBe('CREATE_CUSTOMER');
  });

  it('liefert ToolCall mit Vor- und Nachname bei vollständiger Eingabe', async () => {
    const res = await nlu('erstelle kundendossier vorname Max nachname Muster');
    expect(res.needFollowup).toBeFalsy();
    expect(res.tool?.name).toBe('CREATE_CUSTOMER');
    expect(res.tool?.args).toMatchObject({ firstName: 'Max', lastName: 'Muster' });
    expect(res.reply).toMatch(/Alles klar/i);
  });
});


