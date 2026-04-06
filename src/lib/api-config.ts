/**
 * rajamods7 AI - Private API Configuration
 * Developed & Owned by rajamods7
 */

export const RAJAMODS7_CONFIG = {
  API_NAME: "rajamods7 Private API",
  VERSION: "v1.0-Live",
  MODEL_ENGINE: "gemini-3.1-flash-live-preview", // Internal engine name
  DEVELOPER: "rajamods7",
  OWNER: "rajamods7",
  ENDPOINTS: {
    VOICE_STREAM: "wss://api.rajamods7.ai/v1/stream", // Branded endpoint
  }
};

export const getApiKey = () => {
  return process.env.RAJAMODS7_API_KEY || process.env.GEMINI_API_KEY;
};
