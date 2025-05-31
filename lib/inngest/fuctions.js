import { db } from "../prismaClient";
import { inngest } from "./client";
import { GoogleGenAI, Type } from "@google/genai"; // Import Type

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" }, // Run every Sunday at midnight
  async ({ event, step }) => {
    const industries = await step.run("Fetch industries", async () => {
      // Fetch all unique industries from your User table instead of IndustryInsight
      // because IndustryInsight might not exist yet for new industries.
      // Assuming 'industry' is a field on your User model that stores their chosen industry.
      const uniqueIndustries = await db.user.findMany({
        distinct: ['industry'], // Get only unique industry values
        select: { industry: true },
        where: {
          industry: {
            not: null // Ensure industry field is not null
          }
        }
      });
      return uniqueIndustries.map(u => u.industry); // Return an array of industry strings
    });

    // Loop through each unique industry found
    for (const industry of industries) {
      const prompt = `As an expert industry analyst, provide a concise and highly factual analysis of the current state of the ${industry} industry. Focus on the most recent and significant developments, data, and trends.

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
    `;

      try {
        const res = await step.ai.wrap(
          "gemini",
          async (p) => {
            return await ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: p,
              config: {
                responseMimeType: "application/json",
                responseSchema: { // Include the full schema here
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
          },
          prompt
        );

        // Check if res.text is valid JSON before parsing
        if (!res || !res.text) {
          console.error(`AI response for industry "${industry}" was empty or undefined.`);
          continue; // Skip to the next industry
        }

        const insights = JSON.parse(res.text);

        await step.run(`Update ${industry} insights`, async () => {
          await db.industryInsight.upsert({ // Use upsert to prevent unique constraint errors
            where: { industry }, // Assumes 'industry' is a unique field in your IndustryInsight model
            update: {
              ...insights,
              lastUpdated: new Date(),
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            create: {
              industry, // Provide the industry field for creation
              ...insights,
              lastUpdated: new Date(),
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        });
      } catch (error) {
        console.error(`Error processing insights for industry "${industry}":`, error);
        // You might want to log this error to a monitoring service or dead-letter queue
        // to handle failed insight generations.
      }
    }
  }
);