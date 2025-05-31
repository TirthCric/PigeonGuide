"use server";

import { db } from "@/lib/prismaClient";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");
  if (!user.industry) throw new Error("User's industry not defined. Cannot generate quiz.");

  const prompt = `
    Generate 3 challenging and precise technical interview questions for a ${user.industry
      } professional${user.skills?.length && user.skills[0] !== ''
        ? ` with expertise in ${user.skills.join(", ")}`
        : ""
      }.
    
    Each question must be a multiple-choice question with exactly 4 distinct options.
    Ensure there is only one correct answer per question, and the explanation is concise and helpful.
    The questions should reflect common challenges and advanced concepts within the field.
    
    Return ONLY the JSON structure defined in the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly 4 distinct options for the multiple-choice question, e.g., 'A: Option text'.",
                  },
                  correctAnswer: {
                    type: Type.STRING,
                    description: "The correct option's letter (e.g., 'A', 'B', 'C', or 'D').", // Clarified
                  },
                  explanation: { type: Type.STRING },
                },
                required: ["question", "options", "correctAnswer", "explanation"],
              },
              description: "An array of 3 technical interview questions.", // Changed from 10 to 3 as per prompt
            },
          },
          required: ["questions"],
        },
      },
    });

    const result = response?.text ? JSON.parse(response.text) : null; // Changed empty string to null if no text

    if (!result || !Array.isArray(result.questions) || result.questions.length === 0) {
      console.error("AI response did not contain a valid 'questions' array or was empty:", JSON.stringify(result, null, 2));
      throw new Error("AI did not return the expected quiz structure.");
    }

    return result.questions;

  } catch (error) {
    console.error("Error generating quiz:", error);
    if (error.message && (error.message.includes("400") || error.message.includes("500") || error.message.includes("unavailable") || error.message.includes("overloaded"))) {
      throw new Error(`AI service temporary error: ${error.message}. Please try again later.`);
    }
    throw new Error("Failed to generate quiz questions due to an unexpected issue.");
  }
}


export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");
  if (!user.industry) throw new Error("User's industry not defined.");

  console.log("Questions : ", questions);
  console.log("Answers : ", answers);
  console.log("score : ", score);

  const questionResults = questions.map((q, index) => {
    // --- FIX START ---
    // This regex attempts to find a leading letter (A-Z or a-z)
    // optionally followed by a common separator (:, ), .)
    // It captures the letter in group 1.
    const userSelectedOptionText = answers[index];
    let userAnswerLetter = null;

    if (userSelectedOptionText) {
        const match = userSelectedOptionText.match(/^([A-Za-z])(?:[):.\s]|$)/);
        if (match && match[1]) {
            userAnswerLetter = match[1].toUpperCase(); // Convert to uppercase for consistent comparison
        }
    }
    // --- FIX END ---

    return {
      question: q.question,
      answer: q.correctAnswer, // This should be the letter (e.g., 'B')
      userAnswer: userSelectedOptionText, // Store the full user answer string for display
      // Compare the correct answer letter (q.correctAnswer) with the extracted and normalized letter from userAnswer
      isCorrect: q.correctAnswer === userAnswerLetter,
      explanation: q.explanation,
    };
  });

  console.log("Question results: ", questionResults); // Now this should show correct 'isCorrect' values

  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  let improvementTip = null;

  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user struggled with the following ${user.industry} technical interview questions:

      ${wrongQuestionsText}

      Based on these areas, provide a concise, specific improvement tip for skill development.
      Focus on the knowledge gaps revealed by these questions.
      Keep the response to under 2 sentences and make it encouraging.
      Do not explicitly state the questions were "wrong" or mention "mistakes." Instead, frame it as areas for learning and practice.
    `;

    try {
      const tipResult = await ai.models.generateContent({
        model: "gemini-2.0-flash", // Ensure this model is suitable and accessible
        contents: [{ role: "user", parts: [{ text: improvementPrompt }] }],
      });

      const rawTipText = tipResult.text; // Use .response?.text()
      if (rawTipText) {
        improvementTip = rawTipText.trim();
      } else {
        console.warn("AI returned an empty tip for wrong answers.");
        improvementTip = "Keep practicing! Every attempt is a step towards mastery.";
      }
      console.log("Generated Improvement Tip:", improvementTip);

    } catch (error) {
      console.error("Error generating improvement tip:", error);
      improvementTip = "Keep practicing! Every attempt is a step towards mastery.";
    }
  } else {
    improvementTip = "Excellent job! Your understanding of the core concepts is strong. Keep up the great work!";
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score, // This score should now be correct
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}


export async function getAssessments() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    try {
        const assessments = await db.assessment.findMany({
            where: {
                userId: user.id,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return assessments;
    } catch (error) {
        console.error("Error fetching assessments:", error);
        throw new Error("Failed to fetch assessments");
    }
}