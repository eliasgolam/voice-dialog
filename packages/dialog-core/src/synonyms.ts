/**
 * Synonym-Definitionen für die Dialog-Engine
 * Verwendet Unicode-Wortgrenzen für sichere Token-Ersetzung
 */

export interface SynonymGroup {
  canonical: string;
  synonyms: string[];
}

export const synonymGroups: SynonymGroup[] = [
  {
    canonical: 'kundendossier',
    synonyms: [
      'kundenmappe',
      'kundenmappen', 
      'kundenakte',
      'akten',
      'dossier',
      'dossiers',
      'mappe',
      'mappen',
      'akte'
    ]
  },
  {
    canonical: 'rapport',
    synonyms: [
      'rapport',
      'tagesrapport',
      'bericht',
      'protokoll'
    ]
  },
  {
    canonical: 'rechnung',
    synonyms: [
      'rechnung',
      'rechnungen',
      'abrechnung',
      'beleg',
      'invoice'
    ]
  }
];

/**
 * Escaped einen String für sichere Verwendung in RegExp
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sichere Synonym-Normalisierung mit Unicode-Wortgrenzen
 * Verhindert Teilwort-Zerstörung und falsche Ersetzungen in Komposita
 */
export function synonymNormalize(text: string): string {
  let normalizedText = text;
  
  for (const group of synonymGroups) {
    for (const synonym of group.synonyms) {
      // Unicode-Wortgrenzen mit Property Escapes für sichere Token-Ersetzung
      // (?<=^|\P{L}) - Positive Lookbehind: Anfang des Strings oder Nicht-Buchstabe
      // (?=$|\P{L}) - Positive Lookahead: Ende des Strings oder Nicht-Buchstabe
      const pattern = new RegExp(
        `(?<=^|\\P{L})(${escapeRegExp(synonym)})(?=$|\\P{L})`, 
        'giu'
      );
      
      normalizedText = normalizedText.replace(pattern, group.canonical);
    }
  }
  
  return normalizedText;
}

/**
 * Erweiterte Normalisierung mit zusätzlichen Text-Verbesserungen
 */
export function normalizeText(text: string): string {
  // Basis-Normalisierung
  let normalized = text.trim().toLowerCase();
  
  // Synonym-Normalisierung
  normalized = synonymNormalize(normalized);
  
  // Whitespace-Normalisierung
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

