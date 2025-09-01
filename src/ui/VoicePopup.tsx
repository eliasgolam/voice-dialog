import React, { useCallback, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable } from 'react-native';
import { handleUserText } from '../dialog/controller';

export default function VoicePopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [state, setState] = useState<'idle'|'listening'|'thinking'|'speaking'>('idle');
  const [input, setInput] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const sessionId = 'local-dev-user-1';

  const onUserSend = useCallback(async (text: string) => {
    const t = (text || '').trim();
    if (!t) return;
    setInput('');
    setState('thinking');
    try {
      const res = await handleUserText(t, sessionId);
      setAssistantText(res.text);
      setSuggestions(res.suggestions ?? []);
    } finally {
      setState('idle');
    }
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center'}}>
        <View style={{width:'92%', borderRadius:16, padding:16, backgroundColor:'#0f0f14'}}>
          <Text style={{color:'#fff', marginBottom:8}}>
            {state==='thinking' ? 'Denke nach…' : state==='speaking' ? 'Spreche…' : 'Bereit.'}
          </Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Tippe hier (sprache simuliert)"
            placeholderTextColor="#888"
            style={{color:'#fff', backgroundColor:'#1e1e26', padding:12, borderRadius:12}}
            onSubmitEditing={async () => {
              await onUserSend(input);
            }}
            returnKeyType="send"
          />
          {assistantText ? (
            <View style={{marginTop:10}}>
              <Text style={{color:'#fff'}}>{assistantText}</Text>
            </View>
          ) : null}
          {suggestions && suggestions.length > 0 ? (
            <View style={{flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:10}}>
              {suggestions.map(s => (
                <Pressable key={s} onPress={() => onUserSend(s)} style={{paddingVertical:8, paddingHorizontal:12, backgroundColor:'#2a2a33', borderRadius:10}}>
                  <Text style={{color:'#fff'}}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable onPress={onClose} style={{marginTop:12, alignSelf:'flex-end', padding:10, backgroundColor:'#2a2a33', borderRadius:10}}>
            <Text style={{color:'#fff'}}>Schliessen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}


