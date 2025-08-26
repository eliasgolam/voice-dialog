export type DialogState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type IntentName = 'greet' | 'time' | 'help' | 'fallback';

export interface NluSlotMap {
  [slotName: string]: string;
}

export interface NluResult {
  intent: IntentName;
  confidence: number;
  slots: NluSlotMap;
}

export interface DialogTurn {
  userText: string;
  nlu: NluResult;
  replyText: string;
}

export interface DialogContext {
  lastTurn?: DialogTurn;
}
