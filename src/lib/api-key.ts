/**
 * rajamods7 AI - Private API Key Management
 * 
 * NOTE: For security, the key is fetched from system secrets.
 * If you want to hardcode your key, replace the value below.
 */

// Ye variable aapki working key ko system se uthata hai
// Multiple fallbacks for different environments
export const RAJAMODS7_PRIVATE_KEY = 
  process.env.GEMINI_API_KEY || 
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  "YOUR_MANUAL_KEY_HERE";

// Debugging (Masked)
const maskedKey = RAJAMODS7_PRIVATE_KEY && RAJAMODS7_PRIVATE_KEY !== "YOUR_MANUAL_KEY_HERE" 
  ? `${RAJAMODS7_PRIVATE_KEY.substring(0, 4)}...${RAJAMODS7_PRIVATE_KEY.substring(RAJAMODS7_PRIVATE_KEY.length - 4)}`
  : "NOT_SET";

console.log(`rajamods7 AI: Private API Key Loaded (${maskedKey})`);
