
"use server";

import { db } from "@/lib/prismaClient";
import { auth } from "@clerk/nextjs/server";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("User not authenticated");
    }


    const user = await db.user.findUnique({
        where: {
            clerkUserId: userId,
        }
    })

    if (!user) {
        throw new Error("User not found");
    }

    try {

        const result = await db.$transaction(
            async (tx) => {
                // find if industy exists
                let industryInsight = await tx.IndustryInsight.findUnique({
                    where: {
                        industry: data.industry,
                    },
                });

                // if industry does not exist, create it with default value

                if (!industryInsight) {
                    const insights = await generateAIInsights(data.industry);

                     industryInsight = await db.IndustryInsight.create({
                        data: {
                            industry: data.industry,
                            ...insights,
                            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        }
                    })
                }

                // update user
                const updatedUser = await tx.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        industry: data.industry,
                        experiance: data.experiance,
                        bio: data.bio,
                        skills: data.skills,
                    }
                });

                return { updatedUser, industryInsight };
            },
            {
                timeout: 10000, // 10 seconds
            }
        )

        return { success: true, ...result }

    } catch (error) {
        console.error("Error updating user:", error);
        throw new Error("Failed to update user");
    }
}


export async function getUserOnboardingStatus() {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("User not authenticated");
    }


    const user = await db.user.findUnique({
        where: {
            clerkUserId: userId,
        }
    })

    if (!user) {
        throw new Error("User not found");
    }

    try {

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId,
            },
            select: {
                industry: true,
            },
        });

        return {
            isOnboarded: !!user?.industry,
        };
    } catch (error) {
        console.error("Error checking onboarding status:", error);
        throw new Error("Failed to check onboarding status");
    }
}