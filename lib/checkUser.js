import { currentUser } from "@clerk/nextjs/server"
import { db } from "./prismaClient";


export const checkUser = async () => {
    const user = await currentUser();

    if(!user) {
        return null;
    }

    try {
       const loggedInUser = await db.user.findUnique({
            where: {
                clerkUserId: user?.id
            }
        })

        if(loggedInUser) {
            return loggedInUser
        }

        const name = `${user.firstName} ${user.lastName}`
        const newUser = await db.user.create({
            data: {
                clerkUserId: user?.id,
                name,
                imageUrl: user?.imageUrl,
                email: user?.primaryEmailAddress?.emailAddress
            }
        });

        return newUser;

    } catch (error) {
        console.log("This is error from checkUser.js line:36 -> ", error.message)
    }
}