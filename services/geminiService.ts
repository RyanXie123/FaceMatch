import { GoogleGenAI, Type, SchemaType } from "@google/genai";
import { LevelData, ObstacleConfig, SimilarityResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const compareFaces = async (imageBase64: string): Promise<SimilarityResult> => {
  const modelId = "gemini-2.5-flash";
  
  // Clean base64 string if needed
  const data = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

  const prompt = `Analyze the image. There should be exactly two people. 
  Compare their facial features (eyes, nose, mouth, face shape, expression).
  
  Provide:
  1. A similarity score from 0 to 100.
  2. A short, witty, and fun 1-sentence commentary about their resemblance (or lack thereof).
  3. A list of 3 key matching or mismatching features.
  
  Return valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            comment: { type: Type.STRING },
            features: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['score', 'comment', 'features'],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      score: result.score || 0,
      comment: result.comment || "Analysis unclear.",
      features: result.features || []
    };

  } catch (error) {
    console.error("Gemini Face Analysis Error:", error);
    return {
      score: 0,
      comment: "Could not analyze faces. Try better lighting!",
      features: []
    };
  }
};

export const generateLevel = async (difficulty: 'normal' | 'hard' | 'extreme'): Promise<LevelData> => {
  const modelId = "gemini-2.5-flash";
  
  const difficultyContext = {
    normal: "Standard pace, navigatable gaps.",
    hard: "Fast pace, narrow gaps, frequent obstacles.",
    extreme: "Very fast, bullet-hell density, requiring precise movement."
  }[difficulty];

  const prompt = `Generate a ${difficulty} difficulty level for a submarine side-scroller game. 
  Context: ${difficultyContext}
  The game lasts about 45 seconds. 
  Generate a sequence of obstacles that the player must dodge.
  The output must be a valid JSON object.
  
  Obstacle types:
  - shark: moves fast horizontally (speedMulti > 1.5)
  - puffer: moves medium
  - mine: static but deadly
  - jellyfish: bobs up and down slightly

  For 'entryTime', space them out so it's playable but challenging. Total time approx 45000ms.
  'yPercent' is 0 (top) to 100 (bottom).
  'speedMulti' is multiplier of base speed (usually 1.0 to 2.5).
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            obstacles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['shark', 'puffer', 'mine', 'jellyfish'] },
                  yPercent: { type: Type.NUMBER },
                  speedMulti: { type: Type.NUMBER },
                  entryTime: { type: Type.NUMBER },
                },
                required: ['type', 'yPercent', 'speedMulti', 'entryTime'],
              },
            },
          },
          required: ['name', 'description', 'obstacles', 'difficulty'],
        },
      },
    });

    const levelRaw = JSON.parse(response.text || "{}");
    
    // Add IDs
    const obstacles: ObstacleConfig[] = (levelRaw.obstacles || []).map((obs: any, index: number) => ({
      ...obs,
      id: `obs-${index}-${Date.now()}`,
    }));

    return {
      name: levelRaw.name || "Unknown Depths",
      description: levelRaw.description || "A mysterious trench.",
      difficulty: levelRaw.difficulty || difficulty,
      obstacles: obstacles,
    };

  } catch (error) {
    console.error("Gemini Level Gen Error:", error);
    // Fallback level
    return {
      name: "Emergency Backup Trench",
      description: "Communication with AI lost. Manual navigation engaged.",
      difficulty: "normal",
      obstacles: Array.from({ length: 20 }).map((_, i) => ({
        id: `fallback-${i}`,
        type: i % 2 === 0 ? 'shark' : 'mine',
        yPercent: 20 + Math.random() * 60,
        speedMulti: 1 + Math.random(),
        entryTime: 2000 + i * 1500,
      })),
    };
  }
};

export const generateGameCommentary = async (won: boolean, score: number): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `The player just finished a submarine game. 
  Result: ${won ? "WON" : "DIED"}.
  Score: ${score}.
  Write a short, witty, and slightly sarcastic 2-sentence commentary on their performance.
  If they died, make a fish pun.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || (won ? "Mission Accomplished!" : "Fish food.");
  } catch (e) {
    return won ? "Great job!" : "Game Over.";
  }
};