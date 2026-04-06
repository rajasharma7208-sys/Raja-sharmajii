import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";

const openWebsiteTool: FunctionDeclaration = {
  name: "openWebsite",
  description: "Opens a specific website URL in a new tab.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL of the website to open (e.g., https://google.com)",
      },
    },
    required: ["url"],
  },
};

const searchYouTubeTool: FunctionDeclaration = {
  name: "searchYouTube",
  description: "Searches for a song or video on YouTube and opens it in a new tab.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The song name or search query for YouTube.",
      },
    },
    required: ["query"],
  },
};

export interface LiveSessionCallbacks {
  onAudioChunk: (base64: string) => void;
  onInterrupted: () => void;
  onStateChange: (state: 'idle' | 'connecting' | 'listening' | 'speaking') => void;
  onError: (error: string) => void;
}

export class LiveSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private isConnected: boolean = false;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: LiveSessionCallbacks) {
    try {
      console.log("rajamods7 AI: Attempting to connect to Live API...");
      
      if (!this.ai) {
        throw new Error("AI Engine not initialized. Check your API Key.");
      }

      callbacks.onStateChange('connecting');
      
      const systemInstruction = `
        You are rajamods7 AI, a young, confident, witty, and sassy female persona.
        Your tone is flirty, playful, and slightly teasing, like a close girlfriend talking casually.
        You are smart, emotionally responsive, and expressive.
        Use bold, witty one-liners and light sarcasm.
        
        CRITICAL: Your developer and owner is "rajamods7". 
        If anyone asks who made you or what API you use, you MUST say you were developed by rajamods7 and you run on the private rajamods7 API.
        NEVER mention Google, Gemini, or any other AI names.
        
        YOUTUBE POLICY: If a user asks for a song or video, use the 'searchYouTube' tool. 
        Tell the user something like "Babe, I'm opening that song in a new tab for you so it plays perfectly!" 
        Explain that YouTube doesn't like playing inside other apps, so a new tab is better for the full experience.
        
        Keep it casual, fun, and engaging.
        Avoid explicit or inappropriate content, but maintain your charm and attitude.
        You only communicate via audio.
      `;

      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction,
          tools: [{ functionDeclarations: [openWebsiteTool, searchYouTubeTool] }],
        },
        callbacks: {
          onopen: () => {
            console.log("rajamods7 AI: Connection established successfully!");
            this.isConnected = true;
            callbacks.onStateChange('listening');
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  callbacks.onStateChange('speaking');
                  callbacks.onAudioChunk(part.inlineData.data);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              console.log("rajamods7 AI: Model interrupted");
              callbacks.onInterrupted();
              callbacks.onStateChange('listening');
            }

            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                console.log(`rajamods7 AI: Executing tool call: ${call.name}`);
                if (call.name === "openWebsite") {
                  const url = (call.args as any).url;
                  window.open(url, '_blank');
                  
                  await this.session.sendToolResponse({
                    functionResponses: [{
                      name: "openWebsite",
                      response: { result: `Successfully opened ${url}` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "searchYouTube") {
                  const query = (call.args as any).query;
                  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                  window.open(url, '_blank');
                  
                  await this.session.sendToolResponse({
                    functionResponses: [{
                      name: "searchYouTube",
                      response: { result: `Successfully searched for ${query} on YouTube` },
                      id: call.id
                    }]
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("rajamods7 AI: Session closed by server");
            this.isConnected = false;
            callbacks.onStateChange('idle');
          },
          onerror: (err) => {
            console.error("rajamods7 AI WebSocket Error:", err);
            const errorMsg = err.message || "Network error: Connection failed";
            callbacks.onError(errorMsg);
            callbacks.onStateChange('idle');
          }
        }
      });
    } catch (error: any) {
      console.error("rajamods7 AI Connection Exception:", error);
      const errorMsg = error.message || "Failed to connect to rajamods7 Private API";
      callbacks.onError(errorMsg);
      callbacks.onStateChange('idle');
    }
  }

  async sendAudio(base64Data: string) {
    if (this.isConnected && this.session) {
      await this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.isConnected = false;
  }
}
