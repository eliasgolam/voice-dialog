import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable } from 'react-native';
import { DialogManager } from '../dialog/manager';

export default function VoicePopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const dmRef = useRef<DialogManager | null>(null);
  const [state, setState] = useState<'idle'|'listening'|'thinking'|'speaking'>('idle');
  const [input, setInput] = useState('');

  useEffect(() => {
    dmRef.current = new DialogManager({ onState: setState });
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
              const t = input.trim();
              if (!t) return;
              setInput('');
              dmRef.current?.bargeIn();
              await dmRef.current?.handleUserText(t);
            }}
            returnKeyType="send"
          />
          <Pressable onPress={onClose} style={{marginTop:12, alignSelf:'flex-end', padding:10, backgroundColor:'#2a2a33', borderRadius:10}}>
            <Text style={{color:'#fff'}}>Schliessen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}


