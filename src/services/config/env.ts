// Environment configuration compatible with both Web and React Native
const normalize = (v?: string) => (v || '').trim();

// Simple environment variable access that works on both platforms
const getEnvVar = (key: string): string | undefined => {
  try {
    // For React Native
    // @ts-ignore
    if (typeof global !== 'undefined' && global.Config) {
      // @ts-ignore
      return global.Config[key];
    }
    
    // Fallback to process.env for Node.js
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (error) {
    console.warn('Failed to access environment variable:', key, error);
  }
  
  return undefined;
};

export const env = {
  elevenLabsApiKey: normalize(getEnvVar('ELEVEN_API_KEY')),
  elevenLabsVoiceId: normalize(getEnvVar('ELEVEN_VOICE_ID')) || 'EXAVITQu4vr4xnSDxMaL',
};
