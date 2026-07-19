import { failure, success } from "@/lib/api";
import { getSession } from "@/lib/session";
import { updateProfileSchema } from "@/schemas/profileSchema";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(request:NextRequest) {
    try {
        const session = await getSession(request);
        if(!session)
            return failure(
                "Not authenticated",
                401
            );
        
        const user = await prisma.user.findUnique({
                where: { 
                    id: session.userID 
                },
                select: { 
                    id: true, 
                    username: true, 
                    email: true, 
                    avatarUrl: true,
                    nickname: true   
                },
        });

    if (!user) return failure("User not found", 404);

        return success(
            user,
            "User fetched",
            200
        )   
            
    } catch (error) {
        return failure(
            "Error fetching",
            500,
            error
        )
    }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) 
        return failure(
            "Not authenticated", 
            401
        );

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success)
        return failure(
            "Invalid input", 
            400
        );

    const { nickname, avatarUrl } = parsed.data;


    const updatedUser = await prisma.user.update({
        where: { id: session.userID },
        data: { nickname, avatarUrl },
        select: { id: true, username: true, nickname: true, avatarUrl: true, email: true },    
    });

    return success(
        updatedUser, 
        "Profile updated", 
        200
    );
  } catch (error) {
    
    console.error("Error updating profile", error);
    return failure("Error updating profile", 500);
  }
}