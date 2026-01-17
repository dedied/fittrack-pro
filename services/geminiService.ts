
import { GoogleGenAI, Type } from "@google/genai";
import { WorkoutLog } from "../types";

export const getAIInsights = async (logs: WorkoutLog[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const recentLogs = logs.slice(-20); // Last 20 logs for context
  const dataSummary = recentLogs.map(log => `${log.date}: ${log.type} - ${log.reps} reps`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are a supportive, high-energy virtual fitness coach. 
        Analyze the following workout data and provide a short, motivating 2-3 sentence insight. 
        Focus on trends or offer a small tip for improvement.
        
        Data:
        ${dataSummary || "No data yet."}
      `,
      config: {
        maxOutputTokens: 150,
        temperature: 0.7,
      }
    });

    return response.text || "Keep pushing! Every rep counts towards your goal.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Great job staying active today. Consistency is key to seeing results!";
  }
};
