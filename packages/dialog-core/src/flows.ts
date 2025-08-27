import { z } from 'zod';

export type SlotDef = {
  id: string;
  schema: z.ZodTypeAny;
  prompt: string;
};

export type FlowDef = {
  id: string;
  intentPatterns: RegExp[];
  slots: SlotDef[];
  summarize: (filled: Record<string, unknown>) => string;
};

export const flows: FlowDef[] = [
  {
    id: 'create_customer',
    intentPatterns: [/kundendossier/i, /kunde\s+(anlegen|erstellen)/i],
    slots: [
      { id: 'firstName', schema: z.string().min(1), prompt: 'Wie lautet der Vorname?' },
      { id: 'lastName', schema: z.string().min(1), prompt: 'Wie lautet der Nachname?' },
      { id: 'address', schema: z.string().min(3), prompt: 'Wie lautet die Adresse?' },
      { id: 'phone', schema: z.string().regex(/^[+0-9 ()-]{7,}$/), prompt: 'Wie lautet die Telefonnummer?' },
      { id: 'email', schema: z.string().email(), prompt: 'Wie lautet die E-Mail-Adresse?' },
      { id: 'hasProject', schema: z.union([z.literal('ja'), z.literal('nein')]), prompt: 'Gibt es bereits ein Projekt? (ja/nein)' }
    ],
    summarize: (f) => `Kundendossier angelegt: ${f.firstName} ${f.lastName}, ${f.address}, Tel ${f.phone}, ${f.email}, Projekt: ${f.hasProject}.`,
  },
  {
    id: 'invoice',
    intentPatterns: [/rechnung/i, /invoice/i],
    slots: [
      { id: 'project', schema: z.string().min(1), prompt: 'Für welches Projekt soll die Rechnung erstellt werden?' },
    ],
    summarize: (f) => `Rechnung wird erstellt für Projekt "${f.project}".`,
  },
  {
    id: 'rapport',
    intentPatterns: [/rapport/i, /report/i],
    slots: [
      { id: 'project', schema: z.string().min(1), prompt: 'Bitte Projektname:' },
      { id: 'worker', schema: z.string().min(1), prompt: 'Bitte Mitarbeitername:' },
      { id: 'date', schema: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), prompt: 'Bitte heutiges Datum:' },
      { id: 'locationWeather', schema: z.string().min(1), prompt: 'Wo hast du heute gearbeitet und wie war das Wetter?' },
      { id: 'timeRange', schema: z.string().min(1), prompt: 'Wann hast du angefangen und wann aufgehört (inkl. Pausen)?' },
      { id: 'tasks', schema: z.string().min(1), prompt: 'Was genau hast du heute gemacht?' },
      { id: 'progress', schema: z.string().min(1), prompt: 'Gab es Fortschritte oder Wiederholungen von Arbeiten?' },
      { id: 'attendance', schema: z.string().min(1), prompt: 'Wer war heute im Team/auf der Baustelle anwesend?' },
      { id: 'contractors', schema: z.string().min(1), prompt: 'Wurden Fremdfirmen eingesetzt oder besondere Zeiten erfasst?' },
      { id: 'materialsMachines', schema: z.string().min(1), prompt: 'Welches Material und welche Maschinen kamen zum Einsatz?' },
      { id: 'deliveriesDefects', schema: z.string().min(1), prompt: 'Gab es Lieferungen, Defekte oder Engpässe?' },
      { id: 'issuesSafety', schema: z.string().min(1), prompt: 'Gab es Probleme, Sicherheitsvorfälle oder Abweichungen?' },
      { id: 'tomorrowPrep', schema: z.string().min(1), prompt: 'Was sollte morgen vorbereitet werden oder mitgenommen werden?' },
      { id: 'notes', schema: z.string().min(0), prompt: 'Gibt es sonstige Notizen oder Hinweise?' },
      { id: 'photos', schema: z.string().min(0), prompt: 'Möchtest du Fotos zu diesem Rapport erfassen? (Beschreibung/ja/nein)' },
      { id: 'signature', schema: z.string().regex(/unterschr/i), prompt: 'Durchlesen und bestätigen bitte mit Unterschrift. (Antworte: unterschrieben)' }
    ],
    summarize: (f) => `Rapport abgeschlossen für Projekt ${f.project}. Mitarbeiter: ${f.worker}. Datum: ${f.date}.`,
  }
];


