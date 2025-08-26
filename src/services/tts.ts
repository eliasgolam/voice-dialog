import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';
import { env } from './config/env';

Sound.setCategory?.('Playback');

let currentSound: Sound | null = null;

function base64FromArrayBuffer(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    base64 += base64Alphabet[a >> 2];
    base64 += base64Alphabet[((a & 0x03) << 4) | (b >> 4)];
    base64 += base64Alphabet[((b & 0x0f) << 2) | (c >> 6)];
    base64 += base64Alphabet[c & 0x3f];
  }
  if (i < bytes.length) {
    const a = bytes[i++];
    base64 += base64Alphabet[a >> 2];
    if (i === bytes.length) {
      base64 += base64Alphabet[(a & 0x03) << 4];
      base64 += '==';
    } else {
      const b = bytes[i];
      base64 += base64Alphabet[((a & 0x03) << 4) | (b >> 4)];
      base64 += base64Alphabet[(b & 0x0f) << 2];
      base64 += '=';
    }
  }
  return base64;
}

export async function speak(text: string): Promise<void> {
  if (!text || !text.trim()) return;
  const apiKey = env.elevenLabsApiKey;
  const voiceId = env.elevenLabsVoiceId;
  if (!apiKey) throw new Error('ElevenLabs API-Key fehlt');
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({ text, model_id: 'eleven_turbo_v2' }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`TTS fehlgeschlagen: ${response.status} ${body}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = base64FromArrayBuffer(arrayBuffer);
  const filePath = `${RNFS.CachesDirectoryPath}/tts_${Date.now()}.mp3`;
  await RNFS.writeFile(filePath, base64, 'base64');

  if (currentSound) {
    try { currentSound.stop(() => currentSound?.release()); } catch {}
    currentSound = null;
  }

  await new Promise<void>((resolve, reject) => {
    const s = new Sound(filePath, undefined, (error) => {
      if (error) {
        reject(error);
        return;
      }
      currentSound = s;
      s.setVolume?.(1.0);
      s.play((success) => {
        try { s.release(); } finally { currentSound = null; }
        if (!success) reject(new Error('Wiedergabe fehlgeschlagen')); else resolve();
      });
    });
  });
}

export function stopSpeaking(): void {
  if (currentSound) {
    try {
      currentSound.stop(() => {
        try { currentSound?.release(); } finally { currentSound = null; }
      });
    } catch {
      try { currentSound.release(); } finally { currentSound = null; }
    }
  }
}



