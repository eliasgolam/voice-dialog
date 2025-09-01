import { env } from './config/env';

export async function transcribeAudio(file: { uri?: string; buffer?: Blob|ArrayBuffer; filename?: string; mime?: string }) {
  if (!env.openaiApiKey) throw new Error('OPENAI_API_KEY fehlt');
  const endpoint = 'https://api.openai.com/v1/audio/transcriptions';
  const form = new FormData();
  const fname = file.filename || 'audio.wav';

  if (file.buffer) {
    form.append('file', new Blob([file.buffer] as any, { type: file.mime || 'audio/wav' } as any) as any, fname);
  } else if (file.uri) {
    // In RN ggf. fetch + blob; hier vereinfachter Pfad:
    form.append('file', { uri: file.uri, name: fname, type: file.mime || 'audio/wav' } as any);
  } else {
    throw new Error('No audio provided');
  }

  form.append('model', 'whisper-1');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.openaiApiKey}` },
    body: form as any
  });
  if (!res.ok) throw new Error(`Whisper failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.text as string;
}


