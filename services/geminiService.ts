import { GoogleGenAI, Type } from "@google/genai";
import { WorkoutLog, EXERCISES } from "../types";

export const getAIInsights = async (logs: WorkoutLog[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const recentLogs = logs.slice(-20); // Last 20 logs for context
  const dataSummary = recentLogs.map(log => {
    const ex = EXERCISES.find(e => e.id === log.type);
    const weightInfo = log.weight ? ` at ${log.weight}kg` : "";
    return `${log.date.split('T')[0]}: ${ex?.label || log.type} - ${log.reps} reps${weightInfo}`;
  }).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are a supportive, high-energy virtual fitness coach. 
        Analyze the following workout data and provide a short, motivating 2-3 sentence insight. 
        Focus on trends like increasing reps or increasing weight (progressive overload).
        
        Data:
        ${dataSummary || "No data yet."}
      `,
      config: {
        maxOutputTokens: 200,
        thinkingConfig: { thinkingBudget: 100 },
        temperature: 0.7,
      }
    });

    return response.text || "Keep pushing! Every rep and every kilo counts towards your goal.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Great job staying active today. Consistency and gradual weight increases are key to seeing results!";
  }
};