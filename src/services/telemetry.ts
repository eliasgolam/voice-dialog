export function logEvent(name: string, payload?: unknown): void {
  // Dev-Stub: bewusst leer, damit DialogManager kompilieren & laufen kann
  // Optional: console.log(`[telemetry] ${name}`, payload);
}

export function logTurn(ev: { sessionId: string; phase: 'confirm' | 'execute'; origin: 'llm' | 'fallback'; action?: string; durationMs?: number; }) {
  try { console.debug('[turn]', ev); } catch {}
}


