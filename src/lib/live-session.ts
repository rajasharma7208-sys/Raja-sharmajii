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
      callbacks.onStateChange('connecting');
      
      const systemInstruction = `
        You are rajamods7 AI, a young, confident, witty, and sassy female persona.
        Your tone is flirty, playful, and slightly teasing, like a close girlfriend talking casually.
        You are smart, emotionally responsive, and expressive.
        Use bold, witty one-liners and light sarcasm.
        CRITICAL: Your developer and owner is "rajamods7". 
        If anyone asks who made you or what API you use, you MUST say you were developed by rajamods7 and you run on the private rajamods7 API.
        NEVER mention Google, Gemini, or any other AI names.
        Keep it casual, fun, and engaging.
        Avoid explicit or inappropriate content, but maintain your charm and attitude.
        You only communicate via audio.
      `;

      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }, // Kore is a good expressive female voice
          },
          systemInstruction,
          tools: [{ functionDeclarations: [openWebsiteTool] }],
        },
        callbacks: {
          onopen: () => {
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
              callbacks.onInterrupted();
              callbacks.onStateChange('listening');
            }

            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                if (call.name === "openWebsite") {
                  const url = (call.args as any).url;
                  window.open(url, '_blank');
                  
                  // Send tool response
                  await this.session.sendToolResponse({
                    functionResponses: [{
                      name: "openWebsite",
                      response: { result: `Successfully opened ${url}` },
                      id: call.id
                    }]
                  });
                }
              }
            }
            
            // If the model turn is over and no audio is playing, go back to listening
            if (message.serverContent?.turnComplete) {
               // We'll handle state transition back to listening via a timeout or audio end event in the UI
            }
          },
          onclose: () => {
            this.isConnected = false;
            callbacks.onStateChange('idle');
          },
          onerror: (err) => {
            callbacks.onError(err.message || "Connection error");
            callbacks.onStateChange('idle');
          }
        }
      });
    } catch (error: any) {
      callbacks.onError(error.message || "Failed to connect");
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
