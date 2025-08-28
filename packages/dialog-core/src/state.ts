import { IntentName } from './types';

export interface DialogState {
  pendingSlots: string[];
  filledSlots: Record<string, any>;
  lastIntent: IntentName | null;
  history: Array<{
    type: 'USER_INPUT' | 'SLOT_FILLED' | 'INTENT_DETECTED';
    payload: any;
    timestamp: number;
  }>;
}

export type StateAction = 
  | { type: 'USER_TEXT'; payload: { text: string } }
  | { type: 'ASK'; payload: { slot: string } }
  | { type: 'EXECUTE'; payload: { intent: IntentName; slots: Record<string, any> } }
  | { type: 'RESET' };

export const initialState: DialogState = {
  pendingSlots: [],
  filledSlots: {},
  lastIntent: null,
  history: []
};

export function reduce(state: DialogState, action: StateAction): DialogState {
  const newState = { 
    ...state,
    pendingSlots: [...state.pendingSlots],
    filledSlots: { ...state.filledSlots },
    history: [...state.history]
  };
  const timestamp = Date.now();

  switch (action.type) {
    case 'USER_TEXT': {
      const { text } = action.payload;
      const normalizedText = text.trim();
      
      // Wenn pendingSlots vorhanden sind, NLU NICHT aufrufen
      if (state.pendingSlots.length > 0) {
        const slot = state.pendingSlots[0];
        
        // Slot-Wert direkt setzen
        newState.filledSlots[slot] = normalizedText;
        newState.pendingSlots = state.pendingSlots.slice(1);
        
        // History aktualisieren - nur Slot-Füllung
        newState.history.push({
          type: 'SLOT_FILLED',
          payload: { slot, value: normalizedText },
          timestamp
        });
        
        // Keine zusätzlichen History-Einträge hier - das wird vom aufrufenden System gehandhabt
      } else {
        // Keine pendingSlots: Normaler NLU-Flow
        newState.history.push({
          type: 'USER_INPUT',
          payload: { text: normalizedText, action: 'DETECT_INTENT' },
          timestamp
        });
      }
      break;
    }
    
    case 'ASK': {
      const { slot } = action.payload;
      newState.pendingSlots = [...state.pendingSlots, slot];
      newState.history.push({
        type: 'USER_INPUT',
        payload: { action: 'ASK', slot },
        timestamp
      });
      break;
    }
    
    case 'EXECUTE': {
      const { intent, slots } = action.payload;
      newState.lastIntent = intent;
      newState.filledSlots = { ...slots };
      newState.pendingSlots = [];
      newState.history.push({
        type: 'INTENT_DETECTED',
        payload: { intent, slots },
        timestamp
      });
      break;
    }
    
    case 'RESET': {
      return initialState;
    }
  }
  
  return newState;
}

// Helper-Funktionen
export function hasPendingSlots(state: DialogState): boolean {
  return state.pendingSlots.length > 0;
}

export function getCurrentSlot(state: DialogState): string | null {
  return state.pendingSlots[0] || null;
}

export function getFilledSlots(state: DialogState): Record<string, any> {
  return { ...state.filledSlots };
}

export function getLastIntent(state: DialogState): IntentName | null {
  return state.lastIntent;
}
