import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (aiInstance) return aiInstance;

  const directKey = process.env.GEMINI_API_KEY;
  const replitBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const replitApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

  if (!directKey && !replitBaseUrl) {
    throw new Error(
      "Either GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_BASE_URL must be set.",
    );
  }

  aiInstance = directKey
    ? new GoogleGenAI({ apiKey: directKey })
    : new GoogleGenAI({
        apiKey: replitApiKey!,
        httpOptions: {
          apiVersion: "",
          baseUrl: replitBaseUrl!,
        },
      });

  return aiInstance;
}

export const ai = new Proxy({} as GoogleGenAI, {
  get(_, prop) {
    return (getAi() as any)[prop];
  },
});
