export type ToolCall = {
  name: 'CREATE_CUSTOMER';
  args: Record<string, unknown>;
};

export type NluResult = {
  reply: string;
  tool?: ToolCall;
  needFollowup?: boolean;
};

function extractSlot(text: string, slotLabel: 'vorname' | 'nachname'): string | undefined {
  const patterns = [
    new RegExp(`${slotLabel}[:\s]+"([^"]+)"`, 'i'),
    new RegExp(`${slotLabel}[:\s]+'([^']+)'`, 'i'),
    new RegExp(`${slotLabel}[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\-]+)`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

export async function nlu(userText: string): Promise<NluResult> {
  const text = (userText || '').trim();
  if (!text) {
    return { reply: 'Verstanden. Wie kann ich helfen?' };
  }

  const intentRegex = /(kundendossier|kunde\s+anlegen)/i;
  const intentMatched = intentRegex.test(text);

  if (!intentMatched) {
    return { reply: 'Verstanden. Wie kann ich helfen?' };
  }

  const firstName = extractSlot(text, 'vorname');
  const lastName = extractSlot(text, 'nachname');

  if (!firstName) {
    return {
      reply: 'Wie lautet der Vorname?',
      tool: { name: 'CREATE_CUSTOMER', args: {} },
      needFollowup: true,
    };
  }

  if (!lastName) {
    return {
      reply: 'Wie lautet der Nachname?',
      tool: { name: 'CREATE_CUSTOMER', args: {} },
      needFollowup: true,
    };
  }

  return {
    reply: 'Alles klar. Ich lege das Kundendossier an.',
    tool: { name: 'CREATE_CUSTOMER', args: { firstName, lastName } },
  };
}



