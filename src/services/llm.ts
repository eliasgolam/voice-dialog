import { env } from '../services/config/env';

export const __LLM_DIAGNOSTICS = {
  transport: '' as ''|'proxy'|'direct'|'fallback',
  lastEndpoint: '' as string,
  lastToolCount: -1 as number,
  toolsProvidedCount: -1 as number,
};

export type ChatMessage = { role: 'system'|'user'|'assistant'|'tool'; content: string; name?: string; tool_call_id?: string };
export type ToolSpec = { name: string; description: string; parameters: any };

async function fetchWithTimeout(url: string, init: any, timeout = 15000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function chat(messages: ChatMessage[], tools: ToolSpec[] = []) {
  if (!env.openaiApiKey) {
    // Fallback-Demo: keine echten Tools, nur Echo
    const last = messages.filter(m => m.role === 'user').pop();
    __LLM_DIAGNOSTICS.transport = 'fallback';
    __LLM_DIAGNOSTICS.lastEndpoint = '';
    __LLM_DIAGNOSTICS.lastToolCount = 0;
    return { content: `Demo (ohne API-Key): ${last?.content ?? ''}`, tool_calls: [] as any[] };
  }

  const isBrowser = typeof window !== 'undefined';
  const openaiEndpoint = isBrowser
    ? '/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const toolDefs = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
  __LLM_DIAGNOSTICS.toolsProvidedCount = tools.length;

  __LLM_DIAGNOSTICS.transport = isBrowser ? 'proxy' : 'direct';
  __LLM_DIAGNOSTICS.lastEndpoint = openaiEndpoint;
  __LLM_DIAGNOSTICS.lastToolCount = -1;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isBrowser) {
    headers['Authorization'] = `Bearer ${env.openaiApiKey}`;
  }

  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetchWithTimeout(openaiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: toolDefs,
        tool_choice: 'auto'
      })
    });
    if (res.ok) break;
    if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
      await new Promise(r => setTimeout(r, 500));
      continue;
    }
    break;
  }
  if (!res) throw new Error('OpenAI chat failed: no response');
  if (!res.ok) throw new Error(`OpenAI chat failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  __LLM_DIAGNOSTICS.lastToolCount = Array.isArray(msg?.tool_calls) ? msg.tool_calls.length : 0;
  return { content: msg?.content ?? '', tool_calls: msg?.tool_calls ?? [] };
}

export function toolSchemasFromFiles(objs: any[]): ToolSpec[] {
  return objs.map(o => ({ name: o.name, description: o.description, parameters: o.parameters }));
}


