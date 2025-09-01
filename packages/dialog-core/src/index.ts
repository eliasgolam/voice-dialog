export { DialogEngine } from './engine';
export type { Turn, Role, EngineEvent, EngineDispatch, EngineResult } from './types';
export type { FlowDef, SlotDef } from './flows';
export { reduce, initialState, hasPendingSlots, getCurrentSlot, getFilledSlots, getLastIntent } from './state';
export type { DialogState, StateAction } from './state';

// NLU and Synonyms
export { detectIntent, getTop3Intents, getBestIntent, isIntentConfident } from './nlu';
export type { IntentMatch } from './nlu';
export { synonymNormalize, normalizeText, synonymGroups } from './synonyms';
export type { SynonymGroup } from './synonyms';








