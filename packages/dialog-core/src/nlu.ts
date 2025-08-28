/**
 * Natural Language Understanding (NLU) für die Dialog-Engine
 * Verwendet sichere Synonym-Normalisierung mit Unicode-Wortgrenzen
 */

import { synonymNormalize, normalizeText } from './synonyms';
import { IntentName } from './types';

export interface DetectOpts {
  onDebug?: (debug: DebugInfo) => void;
}

export interface DebugInfo {
  type: 'INPUT_PROCESSING' | 'INTENT_SCORES';
  normalized?: string;
  synonym?: string;
  top3?: IntentMatch[];
}

export interface IntentMatch {
  intent: IntentName;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  originalText: string;
  normalizedText: string;
  synonymNormalizedText: string;
}

/**
 * Erweiterte Intent-Erkennung mit Synonym-Unterstützung
 * Preprocessing läuft immer vor Intent-Erkennung
 */
export function detectIntent(text: string, opts?: DetectOpts): IntentMatch[] {
  // Garantierte Input-Verarbeitung mit Debug-Event
  const normalized = normalizeText(text || "");
  const synonymed = synonymNormalize(normalized);
  
  // INPUT_PROCESSING-Event garantiert senden
  opts?.onDebug?.({ 
    type: "INPUT_PROCESSING", 
    normalized, 
    synonym: synonymed 
  });
  
  // Ab hier NUR noch mit synonymed weiterarbeiten
  const originalText = text;
  const matches: IntentMatch[] = [];
  
  // Intent-Patterns mit Scores basierend auf Match-Qualität
  const patterns = [
    {
      intent: 'create_customer' as IntentName,
      patterns: [
        { regex: /\bkundendossier\b/i, score: 0.95, confidence: 'high' as const },
        { regex: /\bkunde\s+(anlegen|erstellen)\b/i, score: 0.90, confidence: 'high' as const },
        { regex: /\bkundenmappe\b/i, score: 0.88, confidence: 'high' as const },
        { regex: /\bkundenakte\b/i, score: 0.85, confidence: 'high' as const },
        { regex: /\bdossier\b/i, score: 0.80, confidence: 'medium' as const },
        { regex: /\bmappe\b/i, score: 0.75, confidence: 'medium' as const },
        { regex: /\bakte\b/i, score: 0.70, confidence: 'medium' as const }
      ]
    },
    {
      intent: 'invoice' as IntentName,
      patterns: [
        { regex: /\brechnung\b/i, score: 0.95, confidence: 'high' as const },
        { regex: /\binvoice\b/i, score: 0.90, confidence: 'high' as const },
        { regex: /\babrechnung\b/i, score: 0.85, confidence: 'high' as const },
        { regex: /\bbeleg\b/i, score: 0.80, confidence: 'medium' as const }
      ]
    },
    {
      intent: 'rapport' as IntentName,
      patterns: [
        { regex: /\brapport\b/i, score: 0.95, confidence: 'high' as const },
        { regex: /\btagesrapport\b/i, score: 0.90, confidence: 'high' as const },
        { regex: /\bbericht\b/i, score: 0.85, confidence: 'high' as const },
        { regex: /\bprotokoll\b/i, score: 0.80, confidence: 'medium' as const }
      ]
    }
  ];
  
  // Teste alle Patterns NUR gegen synonym-normalisierten Text (Hauptlogik)
  for (const intentPattern of patterns) {
    let bestScore = 0;
    let bestConfidence: 'high' | 'medium' | 'low' = 'low';
    
    for (const pattern of intentPattern.patterns) {
      // Teste NUR gegen synonym-normalisierten Text (Hauptpfad)
      if (pattern.regex.test(synonymed)) {
        if (pattern.score > bestScore) {
          bestScore = pattern.score;
          bestConfidence = pattern.confidence;
        }
      }
      
      // Kein Fallback mehr - wir verwenden nur noch synonymed
    }
    
    if (bestScore > 0) {
      matches.push({
        intent: intentPattern.intent,
        score: bestScore,
        confidence: bestConfidence,
        originalText,
        normalizedText: normalized,
        synonymNormalizedText: synonymed
      });
    }
  }
  
  // Sortiere nach Score (höchster zuerst)
  const ranked = matches.sort((a, b) => b.score - a.score);
  
  // INTENT_SCORES-Event mit top3 senden
  opts?.onDebug?.({ 
    type: "INTENT_SCORES", 
    top3: ranked.slice(0, 3) 
  });
  
  return ranked;
}

/**
 * Top-3 Intents mit Scores
 * Verwendet synonym-normalisierten Text für bessere Intent-Erkennung
 */
export function getTop3Intents(text: string, opts?: DetectOpts): IntentMatch[] {
  const allMatches = detectIntent(text, opts);
  return allMatches.slice(0, 3);
}

/**
 * Beste Intent-Übereinstimmung
 * Verwendet synonym-normalisierten Text für bessere Intent-Erkennung
 */
export function getBestIntent(text: string, opts?: DetectOpts): IntentMatch | null {
  const matches = detectIntent(text, opts);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Intent-Konfidenz-Check
 */
export function isIntentConfident(match: IntentMatch, threshold: number = 0.7): boolean {
  return match.score >= threshold;
}
