"use server";
import { db } from "@/lib/prismaClient";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateAIInsights = async (industry) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `
      As an expert industry analyst, provide a concise and highly factual analysis of the current state of the ${industry} industry. Focus on the most recent and significant developments, data, and trends.

      **Guidelines for Output:**
      - **Precision and Accuracy:** Ensure all data points, figures, and trends are as accurate and up-to-date as possible. Avoid speculation or generalities.
      - **Consistency:** For the same input industry, the output should be highly consistent in its factual content and structure.
      - **Data Source Assumption:** Assume access to a comprehensive, up-to-date database of global industry statistics, market reports, and economic indicators.
      - **Format Strictness:** Adhere strictly to the provided JSON schema. No additional text, notes, conversational elements, or markdown outside the JSON.

      **Specific Data Requirements:**
      - **"salaryRanges":** Include concrete, recent salary data for at least 5 of the most common and representative roles within the ${industry} industry. Provide typical ranges (min, max, median) and indicate a general location (e.g., "Global", "North America", "Key Hub Cities").
      - **"growthRate":** Provide a precise, recent (e.g., last 12-24 months or projected next 12 months) growth rate as a numerical percentage.
      - **"demandLevel":** Select accurately from "HIGH", "MEDIUM", or "LOW" based on current market demand.
      - **"topSkills":** List at least 5 highly sought-after and current skills for professionals in this industry.
      - **"marketOutlook":** Select accurately from "POSITIVE", "NEUTRAL", or "NEGATIVE" based on the overall market sentiment and economic indicators.
      - **"keyTrends":** Identify and list at least 5 of the most impactful and recent trends shaping the ${industry} industry.
      - **"recommendedSkills":** List at least 5 skills that professionals should focus on for future growth in this industry.

      Return ONLY the JSON structure defined in the schema.
    `, // Instructions moved into the main prompt content,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          salaryRanges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                min: { type: Type.NUMBER },
                max: { type: Type.NUMBER },
                median: { type: Type.NUMBER },
                location: { type: Type.STRING },
              },
              propertyOrdering: ["role", "min", "max", "median", "location"],
              description: "At least 5 common roles for salary ranges.",
            },
          },
          growthRate: {
            type: Type.NUMBER,
            description: "Percentage growth rate.",
          },
          demandLevel: {
            type: Type.STRING,
            enum: ["HIGH", "MEDIUM", "LOW"],
          },
          topSkills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "At least 5 skills.",
          },
          marketOutlook: {
            type: Type.STRING,
            enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
          },
          keyTrends: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "At least 5 trends.",
          },
          recommendedSkills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        propertyOrdering: [
          "salaryRanges",
          "growthRate",
          "demandLevel",
          "topSkills",
          "marketOutlook",
          "keyTrends",
          "recommendedSkills",
        ],
      },
    },
  });

  // Ensure the response is parsed correctly, handle potential errors
  if (response.text) {
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse AI insights JSON:", e);
      console.error("Raw AI response:", response.text);
      throw new Error("Failed to get valid AI insights.");
    }
  }
  throw new Error("AI did not return a response.");
};

export async function getIndustryInsights() {
  const { userId } = await auth(); // Use auth() directly for server components/actions

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Fetch the user including their industryInsight relationship (if it exists)
  // Ensure your Prisma schema for User model has `industryInsights IndustryInsight? @relation(...)` or similar
  // and that you're `include`ing it if it's a separate model.
  // Based on your previous error, `user.industryInsights` seems to be a single record,
  // so `include` might be needed if it's not eager loaded by default.
  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
    include: {
      industryInsight: true, // Assuming a 1-to-1 or 1-to-many relationship where you only want one insight.
                             // Adjust based on your actual schema (e.g., `industryInsights: true` if it's a list)
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if the user already has a linked industry insight AND if it's still relevant (e.g., not expired)
  // You might want to update the insight if it's old.
  if (user.industryInsight && user.industryInsight.nextUpdate > new Date()) {
    return user.industryInsight;
  }

  // If no existing insight or it needs an update/creation
  try {
    const insightsData = await generateAIInsights(user.industry);

    // Use upsert to create or update the IndustryInsight
    // This is crucial for preventing the P2002 unique constraint error.
    const updatedIndustryInsight = await db.IndustryInsight.upsert({
      where: {
        industry: user.industry, // This assumes 'industry' is the unique field in your IndustryInsight model.
      },
      update: {
        // If an insight for this industry already exists, update its data
        ...insightsData,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Update next update date
      },
      create: {
        // If no insight for this industry exists, create a new one
        industry: user.industry,
        ...insightsData,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Set next update date
      },
    });

    // Link this industryInsight to the user if it's not already linked
    // This is important if your User model has a relation to IndustryInsight.
    // If your User model has `industryInsight IndustryInsight?`, you'll need to update the User.
    await db.user.update({
      where: { id: user.id },
      data: {
        industryInsight: {
          connect: { id: updatedIndustryInsight.id },
        },
      },
    });

    return updatedIndustryInsight;

  } catch (error) {
    console.error("Error in getIndustryInsights:", error);
    throw new Error("Failed to retrieve or generate industry insights.");
  }
}