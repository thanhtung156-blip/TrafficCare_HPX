
import { GoogleGenAI, Type } from "@google/genai";
import { ViolationRecord } from "../types";

// The GoogleGenAI instance is now created inside the function to ensure it always uses
// the most up-to-date API key from process.env.API_KEY as per the integration guidelines.
export const analyzeViolations = async (violations: ViolationRecord[]) => {
  if (violations.length === 0) return "Không có vi phạm nào cần phân tích.";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy tóm tắt các lỗi vi phạm giao thông sau đây và đưa ra lời khuyên cho chủ xe: ${JSON.stringify(violations)}`,
      config: {
        systemInstruction: "Bạn là một chuyên gia luật giao thông Việt Nam. Hãy tóm tắt ngắn gọn, lịch sự và đưa ra hướng dẫn nộp phạt cụ thể.",
      },
    });
    // Correctly access the .text property from GenerateContentResponse (not a method).
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Không thể phân tích dữ liệu vi phạm lúc này.";
  }
};