import { describe, it, expect, beforeEach } from 'vitest';
import { reduce, initialState, DialogState } from './state';
import { StateAction } from './state';

describe('DialogState Reducer', () => {
  let cleanState: DialogState;
  
  beforeEach(() => {
    cleanState = { ...initialState };
  });

  it('should handle initial state', () => {
    expect(initialState.pendingSlots).toEqual([]);
    expect(initialState.filledSlots).toEqual({});
    expect(initialState.lastIntent).toBeNull();
    expect(initialState.history).toEqual([]);
  });

  it('should handle ASK action to add pending slot', () => {
    const action: StateAction = { type: 'ASK', payload: { slot: 'firstName' } };
    const newState = reduce(cleanState, action);
    
    expect(newState.pendingSlots).toEqual(['firstName']);
    expect(newState.history).toHaveLength(1);
    expect(newState.history[0].type).toBe('USER_INPUT');
    expect(newState.history[0].payload.action).toBe('ASK');
    expect(newState.history[0].payload.slot).toBe('firstName');
  });

  it('should handle USER_TEXT with pending slots - no NLU, direct slot filling', () => {
    // Setup: Start with pending slot
    let state = { ...cleanState, pendingSlots: ['firstName'] };
    
    // Action: User provides slot value
    const action: StateAction = { type: 'USER_TEXT', payload: { text: 'Max' } };
    const newState = reduce(state, action);
    
    // Assertions: Slot should be filled, pendingSlots should be empty
    expect(newState.pendingSlots).toEqual([]);
    expect(newState.filledSlots.firstName).toBe('Max');
    // Check that the last history entry is SLOT_FILLED
    const lastHistoryEntry = newState.history[newState.history.length - 1];
    expect(lastHistoryEntry.type).toBe('SLOT_FILLED');
    expect(lastHistoryEntry.payload.slot).toBe('firstName');
    expect(lastHistoryEntry.payload.value).toBe('Max');
  });

  it('should handle USER_TEXT with pending slots - continue asking for next slot', () => {
    // Setup: Start with multiple pending slots
    let state = { ...cleanState, pendingSlots: ['firstName', 'lastName'] };
    
    // Action: User provides first slot value
    const action: StateAction = { type: 'USER_TEXT', payload: { text: 'Max' } };
    const newState = reduce(state, action);
    
    // Assertions: First slot filled, second slot still pending
    expect(newState.pendingSlots).toEqual(['lastName']);
    expect(newState.filledSlots.firstName).toBe('Max');
    expect(newState.filledSlots.lastName).toBeUndefined();
    
    // Should have history for slot filling only
    const lastHistoryEntry = newState.history[newState.history.length - 1];
    expect(lastHistoryEntry.type).toBe('SLOT_FILLED');
    expect(lastHistoryEntry.payload.slot).toBe('firstName');
    expect(lastHistoryEntry.payload.value).toBe('Max');
  });

  it('should handle USER_TEXT with pending slots - execute when all slots filled', () => {
    // Setup: Start with last slot pending and lastIntent set
    let state = { 
      ...cleanState, 
      pendingSlots: ['lastName'], 
      lastIntent: 'create_customer' as any,
      filledSlots: { firstName: 'Max' }
    };
    
    // Action: User provides last slot value
    const action: StateAction = { type: 'USER_TEXT', payload: { text: 'Müller' } };
    const newState = reduce(state, action);
    
    // Assertions: All slots filled, pendingSlots empty, ready to execute
    expect(newState.pendingSlots).toEqual([]);
    expect(newState.filledSlots.firstName).toBe('Max');
    expect(newState.filledSlots.lastName).toBe('Müller');
    
    // Should have history for slot filling only
    const lastHistoryEntry = newState.history[newState.history.length - 1];
    expect(lastHistoryEntry.type).toBe('SLOT_FILLED');
    expect(lastHistoryEntry.payload.slot).toBe('lastName');
    expect(lastHistoryEntry.payload.value).toBe('Müller');
  });

  it('should handle USER_TEXT without pending slots - normal NLU flow', () => {
    // Setup: No pending slots
    let state = { ...cleanState, pendingSlots: [] };
    
    // Action: User provides text
    const action: StateAction = { type: 'USER_TEXT', payload: { text: 'kundendossier' } };
    const newState = reduce(state, action);
    
    // Assertions: Should trigger intent detection
    expect(newState.pendingSlots).toEqual([]);
    const lastHistoryEntry = newState.history[newState.history.length - 1];
    expect(lastHistoryEntry.type).toBe('USER_INPUT');
    expect(lastHistoryEntry.payload.action).toBe('DETECT_INTENT');
    expect(lastHistoryEntry.payload.text).toBe('kundendossier');
  });

  it('should handle EXECUTE action', () => {
    const action: StateAction = { 
      type: 'EXECUTE', 
      payload: { intent: 'create_customer' as any, slots: { firstName: 'Max', lastName: 'Müller' } } 
    };
    const newState = reduce(cleanState, action);
    
    expect(newState.lastIntent).toBe('create_customer');
    expect(newState.filledSlots).toEqual({ firstName: 'Max', lastName: 'Müller' });
    expect(newState.pendingSlots).toEqual([]);
    const lastHistoryEntry = newState.history[newState.history.length - 1];
    expect(lastHistoryEntry.type).toBe('INTENT_DETECTED');
  });

  it('should handle RESET action', () => {
    // Setup: State with some data
    let state = { 
      ...cleanState, 
      pendingSlots: ['firstName'], 
      filledSlots: { test: 'value' },
      lastIntent: 'create_customer' as any
    };
    
    const action: StateAction = { type: 'RESET' };
    const newState = reduce(state, action);
    
    expect(newState).toEqual(initialState);
  });

  it('should normalize user text input', () => {
    let state = { ...cleanState, pendingSlots: ['firstName'] };
    
    // Test with whitespace
    const action: StateAction = { type: 'USER_TEXT', payload: { text: '  Max  ' } };
    const newState = reduce(state, action);
    
    expect(newState.filledSlots.firstName).toBe('Max');
  });

  it('should maintain state immutability', () => {
    const freshState = { ...initialState };
    const action: StateAction = { type: 'ASK', payload: { slot: 'firstName' } };
    const newState = reduce(freshState, action);
    
    // Original state should not be modified
    expect(freshState.pendingSlots).toEqual([]);
    expect(freshState.filledSlots).toEqual({});
    
    // New state should be different
    expect(newState.pendingSlots).toEqual(['firstName']);
    expect(newState !== freshState).toBe(true);
  });

  it('should handle multiple actions in sequence', () => {
    // Test the complete flow: ASK -> USER_TEXT -> EXECUTE
    let state = cleanState;
    
    // 1. ASK for firstName
    const askAction: StateAction = { type: 'ASK', payload: { slot: 'firstName' } };
    state = reduce(state, askAction);
    expect(state.pendingSlots).toEqual(['firstName']);
    
    // 2. User provides firstName
    const userTextAction: StateAction = { type: 'USER_TEXT', payload: { text: 'Max' } };
    state = reduce(state, userTextAction);
    expect(state.pendingSlots).toEqual([]);
    expect(state.filledSlots.firstName).toBe('Max');
    
    // 3. EXECUTE with filled slots
    const executeAction: StateAction = { 
      type: 'EXECUTE', 
      payload: { intent: 'create_customer' as any, slots: { firstName: 'Max' } } 
    };
    state = reduce(state, executeAction);
    expect(state.lastIntent).toBe('create_customer');
    expect(state.filledSlots).toEqual({ firstName: 'Max' });
  });
});
