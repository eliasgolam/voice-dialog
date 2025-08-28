import { describe, it, expect } from 'vitest';
import { synonymNormalize, normalizeText } from './synonyms';

describe('Synonym Normalization', () => {
  describe('synonymNormalize', () => {
    it('should normalize kundenakte to kundendossier', () => {
      const result = synonymNormalize('kundenakte öffnen');
      expect(result).toContain('kundendossier');
      expect(result).toContain('öffnen');
    });

    it('should normalize multiple synonyms to canonical form', () => {
      const result = synonymNormalize('kundenmappe und rechnung erstellen');
      expect(result).toContain('kundendossier');
      expect(result).toContain('rechnung');
    });

    it('should not replace projektakte (no false replacement)', () => {
      const result = synonymNormalize('projektakte öffnen');
      expect(result).toBe('projektakte öffnen');
      expect(result).not.toContain('kundendossier');
    });

    it('should handle plural forms correctly', () => {
      const result = synonymNormalize('kundenmappen und rechnungen');
      expect(result).toContain('kundendossier');
      expect(result).toContain('rechnung');
    });

    it('should normalize rapport synonyms', () => {
      const result = synonymNormalize('tagesrapport erfassen');
      expect(result).toContain('rapport');
      expect(result).toContain('erfassen');
    });

    it('should normalize invoice to rechnung', () => {
      const result = synonymNormalize('invoice erstellen');
      expect(result).toContain('rechnung');
      expect(result).toContain('erstellen');
    });

    it('should preserve case and spacing', () => {
      const result = synonymNormalize('KundenMappe  öffnen');
      expect(result).toContain('kundendossier');
      expect(result).toContain('öffnen');
    });

    it('should handle edge cases safely', () => {
      const result = synonymNormalize('');
      expect(result).toBe('');
      
      const result2 = synonymNormalize('   ');
      expect(result2).toBe('   ');
    });
  });

  describe('normalizeText', () => {
    it('should perform complete text normalization', () => {
      const result = normalizeText('  KundenMappe  öffnen  ');
      expect(result).toBe('kundendossier öffnen');
    });

    it('should handle multiple whitespace', () => {
      const result = normalizeText('kundenmappe    öffnen');
      expect(result).toBe('kundendossier öffnen');
    });

    it('should normalize mixed synonyms', () => {
      const result = normalizeText('KundenAkte und Rechnung erstellen');
      expect(result).toBe('kundendossier und rechnung erstellen');
    });

    it('should preserve non-synonym words', () => {
      const result = normalizeText('projektmappe öffnen');
      expect(result).toBe('projektmappe öffnen');
    });
  });

  describe('Unicode word boundary safety', () => {
    it('should not replace parts of compound words', () => {
      const result = synonymNormalize('projektmappe');
      expect(result).toBe('projektmappe');
      expect(result).not.toContain('kundendossier');
    });

    it('should not replace parts of longer words', () => {
      const result = synonymNormalize('superkundenmappe');
      expect(result).toBe('superkundenmappe');
      expect(result).not.toContain('kundendossier');
    });

    it('should handle word boundaries correctly', () => {
      const result = synonymNormalize('mappe.projekt');
      expect(result).toContain('kundendossier');
      expect(result).toContain('projekt');
    });

    it('should handle punctuation boundaries', () => {
      const result = synonymNormalize('mappe,projekt');
      expect(result).toContain('kundendossier');
      expect(result).toContain('projekt');
    });
  });
});

