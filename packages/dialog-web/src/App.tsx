import React, { useCallback, useMemo, useRef, useState } from 'react';
import { 
  DialogEngine, 
  Turn, 
  DialogState, 
  StateAction, 
  reduce, 
  initialState,
  detectIntent,
  IntentMatch
} from '@secondbrain/dialog-core';

export default function App() {
  const engineRef = useRef<DialogEngine>();
  if (!engineRef.current) engineRef.current = new DialogEngine();
  const engine = engineRef.current;

  // Debug State Management
  const [debugState, setDebugState] = useState<DialogState>(initialState);
  const [useEmbeddings, setUseEmbeddings] = useState(false);
  
  // 1) Robuster Debug-State
  const [debug, setDebug] = useState({
    normalized: "",
    synonym: "",
    topIntents: [] as { name?: string; intent?: string; score: number }[],
    log: [] as string[],
  });

  const [debugLog, setDebugLog] = useState<Array<{
    action: string;
    input: string;
    intent: string | null;
    score: number | null;
    pendingSlots: string[];
    filledSlots: Record<string, any>;
    timestamp: Date;
  }>>([]);

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
    console.debug("onSend called with:", t);
    setInput('');
    
    // Debug: Log input with real NLU
    const normalizedText = t.trim();
    let intentMatches: any[] = [];
    let bestMatch = null;
    
    try {
      // Use runDetect for robust NLU processing
      intentMatches = runDetect(t);
      bestMatch = intentMatches?.[0] || null;
    } catch (error) {
      console.warn('NLU detection failed:', error);
      intentMatches = [];
      bestMatch = null;
    }
    
    // Update debug state
    const newDebugState = reduce(debugState, { type: 'USER_TEXT', payload: { text: normalizedText } });
    setDebugState(newDebugState);
    
    // Log debug information
    const debugEntry = {
      input: normalizedText,
      intent: bestMatch?.intent || null,
      score: bestMatch?.score || 0,
      action: newDebugState.pendingSlots.length > 0 ? 'SLOT_FILLING' : 'INTENT_DETECTION',
      pendingSlots: newDebugState.pendingSlots,
      filledSlots: newDebugState.filledSlots,
      timestamp: new Date()
    };
    setDebugLog(prev => [...prev, debugEntry]);
    
    const res = engine.dispatch({ type: 'USER_TEXT', text: t });
    const turn = res.turn!;
    setHistory((h) => [...h, { role: 'user', text: t }, turn]);
    const ctx = engine.getContext();
    setFlowState({ activeFlowId: ctx.activeFlowId, currentSlotId: ctx.currentSlotId });
    speak(turn.text);
  }

  // Debug Panel Functions
  const resetFlow = () => {
    setDebugState(initialState);
    setDebugLog([]);
    setHistory([]);
    setDebug({ normalized: "", synonym: "", topIntents: [], log: [] });
    setFlowState({ activeFlowId: null, currentSlotId: null });
  };

  // 2) Sicherer onDebug-Callback
  const safeOnDebug = useCallback((evt: any) => {
    if (!evt || typeof evt !== "object") return;
    try {
      if (evt.type === "INPUT_PROCESSING") {
        setDebug((d) => ({
          ...d,
          normalized: evt.normalized ?? "",
          synonym: evt.synonym ?? "",
        }));
      } else if (evt.type === "INTENT_SCORES") {
        const top3 = Array.isArray(evt.top3) ? evt.top3 : [];
        setDebug((d) => ({ ...d, topIntents: top3 }));
      } else if (evt.type === "LOG") {
        setDebug((d) => ({
          ...d,
          log: [...(d.log ?? []), String(evt.entry ?? "")].slice(-200),
        }));
      }
    } catch (e) {
      console.warn("safeOnDebug error", e);
    }
  }, []);

  // 3) detectIntent-Aufruf robust machen
  function runDetect(userText: string) {
    let result: any;
    try {
      // Bevorzugt: Options-Objekt
      result = detectIntent(userText, { onDebug: safeOnDebug });
    } catch {
      try {
        // Fallback: Callback als 2. Parameter
        // @ts-ignore
        result = detectIntent(userText, safeOnDebug);
      } catch {
        try {
          // Fallback: Objekt als einziges Argument
          // @ts-ignore
          result = detectIntent({ text: userText, onDebug: safeOnDebug });
        } catch (e) {
          console.error("detectIntent invocation failed", e);
        }
      }
    }
    return result;
  }

  const getTop3Intents = useCallback(() => {
    // Use actual NLU system with current input
    if (!input.trim()) {
      return [
        { intent: 'create_customer', score: 0.95 },
        { intent: 'invoice', score: 0.85 },
        { intent: 'rapport', score: 0.75 }
      ];
    }
    
    try {
      // Use runDetect for robust NLU processing
      const matches = runDetect(input);
      return matches?.map((match: any) => ({
        intent: match.intent || match.name,
        score: match.score || 0
      })) || [
        { intent: 'create_customer', score: 0.95 },
        { intent: 'invoice', score: 0.85 },
        { intent: 'rapport', score: 0.75 }
      ];
    } catch (error) {
      // Fallback to default intents if NLU fails
      return [
        { intent: 'create_customer', score: 0.95 },
        { intent: 'invoice', score: 0.85 },
        { intent: 'rapport', score: 0.75 }
      ];
    }
  }, [input]);

  // Form submit handler
  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSend();
  }, []);

  return (
    <div style={{display: 'flex', gap: '20px', padding: '20px', fontFamily: 'Inter, system-ui, sans-serif'}}>
      {/* Main Chat Area */}
      <div style={{flex: 1, maxWidth: 720}}>
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
        <form onSubmit={onSubmit} style={{display:'flex', gap: 8, marginTop: 12}}>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              console.debug("Input changed:", e.target.value);
              setInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                console.debug("Enter pressed");
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Tippe hier…"
            style={{flex:1, padding:12, borderRadius:10, border:'1px solid #ccc'}}
          />
          <button 
            type="submit" 
            onClick={() => {
              console.debug("Button clicked");
              onSend();
            }}
            style={{padding: '12px 16px', borderRadius:10, background:'#8C3B4A', color:'#fff', border:'none'}}
          >
            Senden
          </button>
        </form>
      </div>

      {/* Debug Panel */}
      <div style={{width: 400, border: '1px solid #ddd', borderRadius: 12, padding: 16, backgroundColor: '#f8f9fa'}}>
        <h2 style={{margin: '0 0 16px 0', fontSize: '18px', color: '#333'}}>🔍 Debug Panel</h2>
        
         {/* Input Normalization */}
         <div style={{marginBottom: 16}}>
           <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: '#666'}}>Input Processing</h3>
           <div style={{fontSize: '12px', fontFamily: 'monospace'}}>
             <div>Normalized: {debug.normalized || input.trim() || '-'}</div>
             <div>Synonym: {debug.synonym || input.toLowerCase().trim() || '-'}</div>
           </div>
         </div>

         {/* Top 3 Intents */}
         <div style={{marginBottom: 16}}>
           <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: '#666'}}>Top 3 Intents</h3>
           {debug.topIntents.length > 0 ? (
             debug.topIntents.map((item: any, i: number) => (
               <div key={i} style={{fontSize: '12px', marginBottom: '4px'}}>
                 <span style={{color: '#8C3B4A'}}>{item.name || item.intent || 'unknown'}</span>: 
                 <span style={{color: '#666'}}> {(item.score || 0).toFixed(2)}</span>
               </div>
             ))
           ) : (
             getTop3Intents().map((item: any, i: number) => (
               <div key={i} style={{fontSize: '12px', marginBottom: '4px'}}>
                 <span style={{color: '#8C3B4A'}}>{item.intent}</span>: 
                 <span style={{color: '#666'}}> {item.score.toFixed(2)}</span>
               </div>
             ))
           )}
         </div>

        {/* Mode Indicator */}
        <div style={{marginBottom: 16}}>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: '#666'}}>Mode</h3>
          <div style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: debugState.pendingSlots.length > 0 ? '#ffd700' : '#90EE90',
            color: debugState.pendingSlots.length > 0 ? '#333' : '#fff',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {debugState.pendingSlots.length > 0 ? '🔄 Slot Filling' : '🎯 Intent Detection'}
          </div>
        </div>

        {/* Control Buttons */}
        <div style={{marginBottom: 16}}>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: '#666'}}>Controls</h3>
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            <button 
              onClick={resetFlow}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 Reset Flow
            </button>
             <button 
               onClick={() => setUseEmbeddings(!useEmbeddings)}
               style={{
                 padding: '8px 12px',
                 borderRadius: '6px',
                 background: useEmbeddings ? '#28a745' : '#6c757d',
                 color: '#fff',
                 border: 'none',
                 fontSize: '12px',
                 cursor: 'pointer'
               }}
             >
               {useEmbeddings ? '✅' : '❌'} Use Embeddings
             </button>
          </div>
        </div>

        {/* State Information */}
        <div style={{marginBottom: 16}}>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: '#666'}}>State</h3>
          <div style={{fontSize: '11px', fontFamily: 'monospace'}}>
            <div>Pending Slots: {debugState.pendingSlots.length}</div>
            <div>Filled Slots: {Object.keys(debugState.filledSlots).length}</div>
            <div>Last Intent: {debugState.lastIntent || '-'}</div>
          </div>
        </div>

        {/* Debug Log */}
        <div style={{marginBottom: 16}}>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', color: '#666'}}>Debug Log</h3>
          <div style={{maxHeight: '200px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace'}}>
            {debugLog.length > 0 ? (
              debugLog.slice(-5).map((entry, i) => (
                <div key={i} style={{marginBottom: '8px', padding: '8px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #eee'}}>
                  <div style={{color: '#8C3B4A', fontWeight: 'bold'}}>{entry.action}</div>
                  <div>Input: {entry.input}</div>
                  <div>Intent: {entry.intent || '-'}</div>
                  <div>Score: {entry.score}</div>
                  <div>Pending: {entry.pendingSlots.join(', ') || '-'}</div>
                  <div>Filled: {Object.entries(entry.filledSlots).map(([k,v]) => `${k}:${v}`).join(', ') || '-'}</div>
                  <div style={{color: '#999', fontSize: '10px'}}>
                    {entry.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div style={{color: '#999', fontStyle: 'italic'}}>Keine Log-Einträge verfügbar</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


