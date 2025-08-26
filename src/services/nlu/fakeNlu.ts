import { z } from 'zod';
import { NluResult, IntentName } from '../../dialog/types';

const resultSchema = z.object({
  intent: z.custom<IntentName>(),
  confidence: z.number().min(0).max(1),
  slots: z.record(z.string()),
});

const intentMatchers: Array<{ intent: IntentName; pattern: RegExp; slot?: string }> = [
  { intent: 'greet', pattern: /\b(hi|hallo|hello|hey)\b/i },
  { intent: 'time', pattern: /\b(zeit|uhr|time|clock)\b/i },
  { intent: 'help', pattern: /\b(help|hilfe)\b/i },
];

export function parseUserTextToNlu(userText: string): NluResult {
  const trimmed = userText.trim();
  let detected: IntentName = 'fallback';
  let confidence = 0.4;
  const slots: Record<string, string> = {};

  for (const { intent, pattern } of intentMatchers) {
    if (pattern.test(trimmed)) {
      detected = intent;
      confidence = 0.9;
      break;
    }
  }

  const parsed = resultSchema.parse({ intent: detected, confidence, slots });
  return parsed;
}
