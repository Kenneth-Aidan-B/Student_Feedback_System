import { GoogleGenAI } from "@google/genai";
import { AIInsights } from "../types";

// API Keys Pool - rotates through keys when one fails
const API_KEYS = [
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '',
  'AIzaSyC_b3ai-fMVw8laVlHmw7OGoaElNaiBCOI',
  'AIzaSyBvuKcxZqVnGOUWxcCPkWmk9lJkvvxe4gk',
  'AIzaSyC8v0CCnmunjWX_dwraCR9ucePTz4V1_uI'
].filter(key => key && key !== 'PLACEHOLDER_API_KEY');

// Track current key index and failed keys
let currentKeyIndex = 0;
const failedKeys = new Set<string>();

// Models to try in order of preference
const MODELS_TO_TRY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
];

let currentModelIndex = 0;

// Get the next available API key
const getNextApiKey = (): string | null => {
  const startIndex = currentKeyIndex;

  do {
    const key = API_KEYS[currentKeyIndex];
    if (key && !failedKeys.has(key)) {
      return key;
    }
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  } while (currentKeyIndex !== startIndex);

  return null; // All keys exhausted
};

// Mark current key as failed and rotate to next
const rotateToNextKey = (): boolean => {
  const currentKey = API_KEYS[currentKeyIndex];
  if (currentKey) {
    failedKeys.add(currentKey);
    console.warn(`🔄 API key ending in ...${currentKey.slice(-4)} failed, rotating to next key`);
  }

  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

  // Check if we have any working keys left
  return API_KEYS.some(key => !failedKeys.has(key));
};

// Create AI client with current key
const createAiClient = (): GoogleGenAI | null => {
  const apiKey = getNextApiKey();
  if (!apiKey) return null;

  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("Failed to create AI client:", e);
    return null;
  }
};

// Check if error is quota-related or permission-related (should rotate key)
const shouldRotateKey = (error: any): boolean => {
  const errorStr = String(error?.message || error).toLowerCase();
  return errorStr.includes('quota') ||
    errorStr.includes('resource_exhausted') ||
    errorStr.includes('429') ||
    errorStr.includes('rate limit') ||
    errorStr.includes('permission') ||
    errorStr.includes('403') ||
    errorStr.includes('unauthorized') ||
    errorStr.includes('invalid api key');
};

// Check if error is model-related (try different model, same key)
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

// 1. Sentiment Analysis with key and model rotation
export const analyzeSentiment = async (text: string): Promise<'Positive' | 'Neutral' | 'Negative'> => {
  if (!text || text.trim().length < 3) return 'Neutral';

  resetModelIndex();
  let keyAttempts = 0;
  const maxKeyAttempts = API_KEYS.length;

  while (keyAttempts < maxKeyAttempts) {
    const ai = createAiClient();
    if (!ai) break;

    let modelAttempts = 0;
    const maxModelAttempts = MODELS_TO_TRY.length;

    while (modelAttempts < maxModelAttempts) {
      try {
        const model = getCurrentModel();
        console.log(`🤖 Sentiment analysis: key ...${API_KEYS[currentKeyIndex]?.slice(-4)}, model: ${model}`);

        const response = await ai.models.generateContent({
          model: model,
          contents: `Analyze the sentiment of this student feedback regarding a course: "${text}". 
          Respond with exactly one word: Positive, Neutral, or Negative.`,
        });

        const result = response.text?.trim();
        if (result === 'Positive' || result === 'Neutral' || result === 'Negative') {
          console.log(`✅ Sentiment analyzed: ${result}`);
          return result;
        }
        return 'Neutral';
      } catch (error: any) {
        console.error("AI Sentiment Error:", error?.message || error);

        if (shouldTryDifferentModel(error)) {
          if (!tryNextModel()) {
            // Tried all models, try next key
            break;
          }
          modelAttempts++;
          continue;
        }

        if (shouldRotateKey(error)) {
          const hasMoreKeys = rotateToNextKey();
          if (!hasMoreKeys) {
            console.warn("⚠️ All API keys exhausted, using fallback");
            break;
          }
          resetModelIndex();
          keyAttempts++;
          break; // Exit model loop, continue with next key
        }

        // Unknown error, use fallback
        break;
      }
    }

    // If we exhausted models for this key, try next key
    if (modelAttempts >= maxModelAttempts) {
      const hasMoreKeys = rotateToNextKey();
      if (!hasMoreKeys) break;
      resetModelIndex();
      keyAttempts++;
    }
  }

  console.log("📊 Using fallback sentiment analysis");
  return fallbackSentimentAnalysis(text);
};

// 2. Subject Insights with key and model rotation
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

  const combinedFeedback = feedbacks.slice(0, 50).join("\n- ");
  resetModelIndex();
  let keyAttempts = 0;
  const maxKeyAttempts = API_KEYS.length;

  while (keyAttempts < maxKeyAttempts) {
    const ai = createAiClient();
    if (!ai) break;

    let modelAttempts = 0;
    const maxModelAttempts = MODELS_TO_TRY.length;

    while (modelAttempts < maxModelAttempts) {
      try {
        const model = getCurrentModel();
        console.log(`🤖 Subject insights: key ...${API_KEYS[currentKeyIndex]?.slice(-4)}, model: ${model}`);

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
            console.log("✅ AI subject insights generated successfully!");
            return {
              strengths: parsed.strengths || [],
              improvements: parsed.improvements || [],
              suggestions: parsed.suggestions || []
            };
          }
        }
        throw new Error("Could not parse response");
      } catch (error: any) {
        console.error("AI Subject Insights Error:", error?.message || error);

        if (shouldTryDifferentModel(error)) {
          if (!tryNextModel()) break;
          modelAttempts++;
          continue;
        }

        if (shouldRotateKey(error)) {
          const hasMoreKeys = rotateToNextKey();
          if (!hasMoreKeys) break;
          resetModelIndex();
          keyAttempts++;
          break;
        }

        break;
      }
    }

    if (modelAttempts >= maxModelAttempts) {
      const hasMoreKeys = rotateToNextKey();
      if (!hasMoreKeys) break;
      resetModelIndex();
      keyAttempts++;
    }
  }

  console.log("📊 Using fallback subject insights");
  return generateFallbackInsights();
};

// 3. Staff Insights with key and model rotation
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

  const combinedFeedback = feedbacks.slice(0, 50).join("\n- ");
  resetModelIndex();
  let keyAttempts = 0;
  const maxKeyAttempts = API_KEYS.length;

  while (keyAttempts < maxKeyAttempts) {
    const ai = createAiClient();
    if (!ai) break;

    let modelAttempts = 0;
    const maxModelAttempts = MODELS_TO_TRY.length;

    while (modelAttempts < maxModelAttempts) {
      try {
        const model = getCurrentModel();
        console.log(`🤖 Staff insights: key ...${API_KEYS[currentKeyIndex]?.slice(-4)}, model: ${model}`);

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
            console.log("✅ AI staff insights generated successfully!");
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
        console.error("AI Staff Insights Error:", error?.message || error);

        if (shouldTryDifferentModel(error)) {
          if (!tryNextModel()) break;
          modelAttempts++;
          continue;
        }

        if (shouldRotateKey(error)) {
          const hasMoreKeys = rotateToNextKey();
          if (!hasMoreKeys) break;
          resetModelIndex();
          keyAttempts++;
          break;
        }

        break;
      }
    }

    if (modelAttempts >= maxModelAttempts) {
      const hasMoreKeys = rotateToNextKey();
      if (!hasMoreKeys) break;
      resetModelIndex();
      keyAttempts++;
    }
  }

  console.log("📊 Using fallback staff insights");
  return generateFallbackInsights();
};

// Export function to check API key status (for debugging)
export const getApiKeyStatus = () => ({
  totalKeys: API_KEYS.length,
  currentKeyIndex,
  failedKeysCount: failedKeys.size,
  hasWorkingKeys: API_KEYS.some(key => !failedKeys.has(key)),
  currentModel: getCurrentModel()
});