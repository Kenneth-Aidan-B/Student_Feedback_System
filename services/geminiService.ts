// © 2026 Kenneth
// Academic & Non-Commercial Use Only
// Commercial use requires explicit permission

import { GoogleGenAI } from "@google/genai";
import { AIInsights } from "../types";

// Get API Key from environment variable
const getApiKey = (): string => {
  return (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
};

// Models to try in order of preference
const MODELS_TO_TRY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
];

let currentModelIndex = 0;

// Create AI client
const createAiClient = (): GoogleGenAI | null => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("Failed to create AI client:", e);
    return null;
  }
};

// Check if error is model-related (try different model)
const shouldTryDifferentModel = (error: any): boolean => {
  const errorStr = String(error?.message || error).toLowerCase();
  return errorStr.includes('not found') ||
    errorStr.includes('404') ||
    errorStr.includes('not supported') ||
    errorStr.includes('does not exist');
};

// Reset model index for a new attempt cycle
const resetModelIndex = () => {
  currentModelIndex = 0;
};

// Get current model name
const getCurrentModel = (): string => {
  return MODELS_TO_TRY[currentModelIndex] || MODELS_TO_TRY[0];
};

// Try next model
const tryNextModel = (): boolean => {
  currentModelIndex++;
  if (currentModelIndex >= MODELS_TO_TRY.length) {
    currentModelIndex = 0;
    return false; // Tried all models
  }
  console.log(`🔄 Trying different model: ${getCurrentModel()}`);
  return true;
};

// Fallback analysis when API is unavailable
const fallbackSentimentAnalysis = (text: string): 'Positive' | 'Neutral' | 'Negative' => {
  const lowerText = text.toLowerCase();
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'helpful', 'best', 'love', 'fantastic', 'awesome', 'clear', 'understand', 'well', 'nice', 'thank'];
  const negativeWords = ['bad', 'poor', 'terrible', 'horrible', 'worst', 'hate', 'boring', 'confusing', 'difficult', 'slow', 'hard', 'unclear', 'problem', 'issue', 'fast'];

  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

  if (positiveCount > negativeCount) return 'Positive';
  if (negativeCount > positiveCount) return 'Negative';
  return 'Neutral';
};

// 1. Sentiment Analysis
export const analyzeSentiment = async (text: string): Promise<'Positive' | 'Neutral' | 'Negative'> => {
  if (!text || text.trim().length < 3) return 'Neutral';

  const ai = createAiClient();
  if (!ai) return fallbackSentimentAnalysis(text);

  resetModelIndex();
  let modelAttempts = 0;
  const maxModelAttempts = MODELS_TO_TRY.length;

  while (modelAttempts < maxModelAttempts) {
    try {
      const model = getCurrentModel();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Analyze the sentiment of this student feedback regarding a course: "${text}". 
        Respond with exactly one word: Positive, Neutral, or Negative.`,
      });

      const result = response.text?.trim();
      if (result === 'Positive' || result === 'Neutral' || result === 'Negative') {
        return result;
      }
      return 'Neutral';
    } catch (error: any) {
      if (shouldTryDifferentModel(error)) {
        if (!tryNextModel()) break;
        modelAttempts++;
        continue;
      }
      break;
    }
  }

  return fallbackSentimentAnalysis(text);
};

// 2. Subject Insights
export const generateSubjectInsights = async (subjectName: string, feedbacks: string[]): Promise<AIInsights> => {
  if (feedbacks.length === 0) {
    return { strengths: [], improvements: [], suggestions: ["No textual feedback available for analysis."] };
  }

  // Generate fallback insights
  const generateFallbackInsights = (): AIInsights => {
    const sentiments = feedbacks.map(f => fallbackSentimentAnalysis(f));
    const positiveCount = sentiments.filter(s => s === 'Positive').length;
    const negativeCount = sentiments.filter(s => s === 'Negative').length;

    const strengths: string[] = [];
    const improvements: string[] = [];
    const suggestions: string[] = [];

    if (positiveCount > feedbacks.length / 2) {
      strengths.push("Majority of students expressed positive feedback about this subject");
      strengths.push("Students appear satisfied with the course content and delivery");
    } else if (positiveCount > 0) {
      strengths.push("Some students expressed positive feedback");
    }

    if (negativeCount > 0) {
      improvements.push("Some students reported concerns that should be addressed");
      suggestions.push("Review individual feedback entries for specific improvement areas");
    }

    if (positiveCount === 0 && negativeCount === 0) {
      suggestions.push("Encourage more detailed feedback from students");
    }

    suggestions.push(`Analysis based on ${feedbacks.length} feedback entries`);

    return { strengths, improvements, suggestions };
  };

  const ai = createAiClient();
  if (!ai) return generateFallbackInsights();

  const combinedFeedback = feedbacks.slice(0, 50).join("\n- ");
  resetModelIndex();
  let modelAttempts = 0;
  const maxModelAttempts = MODELS_TO_TRY.length;

  while (modelAttempts < maxModelAttempts) {
    try {
      const model = getCurrentModel();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Analyze the following student feedback for the subject "${subjectName}". 
        Provide a structured analysis in JSON format with three arrays: "strengths", "improvements", and "suggestions".
        Each array should contain 2-4 brief, actionable items.
        
        Feedback data:
        - ${combinedFeedback}
        
        Respond ONLY with valid JSON in this exact format:
        {"strengths": ["..."], "improvements": ["..."], "suggestions": ["..."]}`,
      });

      if (response.text) {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as AIInsights;
          return {
            strengths: parsed.strengths || [],
            improvements: parsed.improvements || [],
            suggestions: parsed.suggestions || []
          };
        }
      }
      throw new Error("Could not parse response");
    } catch (error: any) {
      if (shouldTryDifferentModel(error)) {
        if (!tryNextModel()) break;
        modelAttempts++;
        continue;
      }
      break;
    }
  }

  return generateFallbackInsights();
};

// 3. Staff Insights
export const generateStaffInsights = async (staffName: string, feedbacks: string[]): Promise<AIInsights> => {
  if (feedbacks.length === 0) {
    return {
      strengths: [],
      areas_of_concern: [],
      actionable_suggestions: ["No textual feedback available."],
      improvements: [],
      suggestions: []
    };
  }

  // Generate fallback insights
  const generateFallbackInsights = (): AIInsights => {
    const sentiments = feedbacks.map(f => fallbackSentimentAnalysis(f));
    const positiveCount = sentiments.filter(s => s === 'Positive').length;
    const negativeCount = sentiments.filter(s => s === 'Negative').length;
    const neutralCount = sentiments.filter(s => s === 'Neutral').length;

    const strengths: string[] = [];
    const areas_of_concern: string[] = [];
    const actionable_suggestions: string[] = [];

    if (positiveCount > feedbacks.length / 2) {
      strengths.push("Majority of student feedback is positive");
      strengths.push("Students appreciate the teaching approach");
    } else if (positiveCount > 0) {
      strengths.push("Some students expressed satisfaction with the teaching");
    }

    if (negativeCount > feedbacks.length / 3) {
      areas_of_concern.push("Notable portion of students expressed concerns");
      actionable_suggestions.push("Review specific feedback entries for detailed improvement areas");
    } else if (negativeCount > 0) {
      areas_of_concern.push("A few students mentioned areas for improvement");
    }

    if (neutralCount > feedbacks.length / 2) {
      actionable_suggestions.push("Encourage more engaging interactions to generate stronger student responses");
    }

    actionable_suggestions.push(`Analysis based on ${feedbacks.length} feedback entries`);

    return {
      strengths,
      areas_of_concern,
      actionable_suggestions,
      improvements: [],
      suggestions: []
    };
  };

  const ai = createAiClient();
  if (!ai) return generateFallbackInsights();

  const combinedFeedback = feedbacks.slice(0, 50).join("\n- ");
  resetModelIndex();
  let modelAttempts = 0;
  const maxModelAttempts = MODELS_TO_TRY.length;

  while (modelAttempts < maxModelAttempts) {
    try {
      const model = getCurrentModel();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Analyze the following aggregated student feedback for Professor "${staffName}". 
        Identify teaching strengths, areas of concern, and actionable suggestions.
        
        Feedback data:
        - ${combinedFeedback}
        
        Respond ONLY with valid JSON in this exact format:
        {"strengths": ["..."], "areas_of_concern": ["..."], "actionable_suggestions": ["..."]}`,
      });

      if (response.text) {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            strengths: parsed.strengths || [],
            areas_of_concern: parsed.areas_of_concern || [],
            actionable_suggestions: parsed.actionable_suggestions || [],
            improvements: [],
            suggestions: []
          };
        }
      }
      throw new Error("Could not parse response");
    } catch (error: any) {
      if (shouldTryDifferentModel(error)) {
        if (!tryNextModel()) break;
        modelAttempts++;
        continue;
      }
      break;
    }
  }

  return generateFallbackInsights();
};

// API Key status helper
export const getApiKeyStatus = () => ({
  hasKey: !!getApiKey(),
  currentModel: getCurrentModel()
});