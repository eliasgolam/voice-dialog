import React, { useMemo, useRef, useState } from 'react';
import { DialogEngine, Turn } from '@secondbrain/dialog-core';

export default function App() {
  const engineRef = useRef<DialogEngine>();
  if (!engineRef.current) engineRef.current = new DialogEngine();
  const engine = engineRef.current;

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Turn[]>([]);
  const [flowState, setFlowState] = useState<{ activeFlowId: string | null; currentSlotId: string | null }>({ activeFlowId: null, currentSlotId: null });

  const speak = useMemo(() => (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utter);
    } catch {}
  }, []);

  async function onSend() {
    const t = input.trim();
    if (!t) return;
    setInput('');
    const res = engine.dispatch({ type: 'USER_TEXT', text: t });
    const turn = res.turn!;
    setHistory((h) => [...h, { role: 'user', text: t }, turn]);
    const ctx = engine.getContext();
    setFlowState({ activeFlowId: ctx.activeFlowId, currentSlotId: ctx.currentSlotId });
    speak(turn.text);
  }

  return (
    <div style={{maxWidth: 720, margin: '40px auto', fontFamily: 'Inter, system-ui, sans-serif'}}>
      <h1>SecondBrain – Dialog Playground</h1>
      <div style={{border: '1px solid #ddd', borderRadius: 12, padding: 16, minHeight: 240}}>
        {history.length === 0 && <div style={{color:'#888'}}>Starte mit einer Nachricht…</div>}
        {history.map((t, i) => (
          <div key={i} style={{margin: '8px 0', display: 'flex', justifyContent: t.role === 'user' ? 'flex-end' : 'flex-start'}}>
            <div style={{background: t.role === 'user' ? '#8C3B4A' : '#222', color:'#fff', padding: '8px 12px', borderRadius: 10, maxWidth: '80%'}}>
              <strong style={{opacity: 0.8}}>{t.role === 'user' ? 'Du' : 'Assistant'}:</strong> {t.text}
            </div>
          </div>
        ))}
        <div style={{marginTop: 8, color:'#777', fontSize: 12}}>Status: {flowState.activeFlowId ?? '-'} / {flowState.currentSlotId ?? '-'}</div>
      </div>
      <div style={{display:'flex', gap: 8, marginTop: 12}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSend(); }}
          placeholder="Tippe hier… (Mic später)"
          style={{flex:1, padding:12, borderRadius:10, border:'1px solid #ccc'}}
        />
        <button onClick={onSend} style={{padding: '12px 16px', borderRadius:10, background:'#8C3B4A', color:'#fff', border:'none'}}>Senden</button>
      </div>
    </div>
  );
}


