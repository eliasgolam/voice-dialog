export type Msg = { role: 'system'|'user'|'assistant'|'tool'; content: string; name?: string; tool_call_id?: string };
export type PendingAction = { name: 'CREATE_RAPPORT'|'CREATE_CUSTOMER'|'ADD_MATERIAL'|'SET_APPOINTMENT'|'CREATE_PROJECT'; params: any } | null;

type Session = {
  history: Msg[];
  pendingAction: PendingAction;
  executed: Set<string>;
  pendingMissing?: string[];
};

const sessions = new Map<string, Session>();

export function getSession(id: string): Session {
  if (!sessions.has(id)) sessions.set(id, { history: [], pendingAction: null, executed: new Set<string>() });
  return sessions.get(id)!;
}

export function resetSession(id: string) { sessions.delete(id); }


