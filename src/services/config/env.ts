import Config from 'react-native-config';

const normalize = (v?: string) => (v || '').trim();

export const env = {
  elevenLabsApiKey: normalize((Config as any).ELEVEN_API_KEY),
  elevenLabsVoiceId: normalize((Config as any).ELEVEN_VOICE_ID) || 'EXAVITQu4vr4xnSDxMaL',
};
