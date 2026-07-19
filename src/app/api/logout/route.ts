import { success ,failure} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token";
import { cookies } from "next/headers";
import {  NextRequest, NextResponse } from "next/server";

export async function DELETE(request:NextRequest) {
    try{
        const refreshTok = request.cookies.get("refreshToken")?.value;

        if (refreshTok) {
            const hashedRefreshToken = hashToken(refreshTok);
            await prisma.refreshToken.deleteMany({
                where: { tokenHash: hashedRefreshToken },
            });
        }       
        const response = success(
            [], 
            "User logged out successfully", 
            200
        );
        
        const cookieOptions = { httpOnly: true, 
                                secure: process.env.NODE_ENV === "production", 
                                sameSite: "strict" as const, 
                                maxAge: 0 
                             };
        response.cookies
        .set(   
            "accessToken", 
            "",
            cookieOptions
        );
        response.cookies
        .set(
            "refreshToken", 
            "", 
            cookieOptions
        );

        return response 
}
    catch(error){
         console.error('Error logging out user', error)
                return failure(
                    "Error logging out user",
                    500
                )
            }
    }

