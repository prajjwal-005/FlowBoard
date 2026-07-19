
// import { NextRequest, NextResponse } from "next/server";
// import { AccessTokenPayload, generateAccessToken, generateRefreshToken, hashToken } from "@/lib/token";
// import { prisma } from "@/lib/prisma";

// export async function GET(request:NextRequest) {

//     const refreshToken = request.cookies.get("refreshToken")?.value;

//     if(!refreshToken){
//         return NextResponse.redirect(new URL("/login", request.url));
//     }

//     const hashedRefreshToken = hashToken(refreshToken);
//     const tokenRecord = await prisma.refreshToken.findUnique({
//         where:{
//             tokenHash: hashedRefreshToken,
//         },
//     });

//     if(!tokenRecord){
//         return NextResponse.redirect(new URL("/login", request.url));
//     }
     
//     const user = await prisma.user.findUnique({
//         where:{
//             id: tokenRecord.userID
//         },
//     })
    
//     if(!user) return NextResponse.redirect(new URL("/login", request.url));
//     const payload:AccessTokenPayload = {
//         userID: user.id,
//         email : user.email
//     }
//     if(tokenRecord.expiresAt< new Date()){
//         await prisma.refreshToken.delete({
//             where: {
//                 id:tokenRecord.id
//             }
//         })
//         return NextResponse.redirect(new URL("/login", request.url));
//     }
    
//     const newRefreshToken =  generateRefreshToken()
//     const newHashRefreshToken = hashToken(newRefreshToken)
//     await prisma.$transaction([
//         prisma.refreshToken.delete({
//             where: {
//             id: tokenRecord.id
//             }
//         }),
//         prisma.refreshToken.create({
//             data: {
//             tokenHash: newHashRefreshToken,
//             userID: user.id,
//             expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//             },
//         }),
//     ])

    
//     const newaccessToken = await generateAccessToken(payload);
//     const next = request.nextUrl.searchParams.get("next") || "/dashboard";
//     const response = NextResponse.redirect(new URL(next, request.url));
//     type option = 
//         {
//         httpOnly: boolean,
//         secure: boolean,
//         sameSite: "strict",
//     }
    
//     const options:option = {
//         httpOnly: true,
//         secure: true,
//         sameSite: "strict",
//     }
//     response.cookies.set(
//         "accessToken",
//         newaccessToken,
//         options
//     )
//     response.cookies.set(
//         "refreshToken",
//         newRefreshToken,
//         options
//     )

//     return response

// }


import { NextRequest, NextResponse } from "next/server";
import {
  AccessTokenPayload,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "@/lib/token";
import { prisma } from "@/lib/prisma";
import { failure } from "@/lib/api";
const ALLOWED_REDIRECT_PATHS = /^\/[a-zA-Z0-9\-_/?=&]*$/; // relative paths only


export async function GET(request: NextRequest) {
try {  
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const hashedRefreshToken = hashToken(refreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashedRefreshToken },
    });

    if (!tokenRecord) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check expiry before user lookup — avoids wasted DB round-trip on expired tokens
    if (tokenRecord.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const user = await prisma.user.findUnique({
        where: { id: tokenRecord.userID },
    });

    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Atomic token rotation
    const newRefreshToken = generateRefreshToken();
    const newHashedRefreshToken = hashToken(newRefreshToken);

    await prisma.$transaction([
        prisma.refreshToken.delete({ where: { id: tokenRecord.id } }),
        prisma.refreshToken.create({
        data: {
            tokenHash: newHashedRefreshToken,
            userID: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        }),
    ]);

    const payload: AccessTokenPayload = { userID: user.id, email: user.email,username:user.username };
    const newAccessToken = await generateAccessToken(payload);

    // Validate ?next to prevent open redirect
    const nextParam = request.nextUrl.searchParams.get("next") || "/dashboard";
    const safeNext = ALLOWED_REDIRECT_PATHS.test(nextParam) ? nextParam : "/dashboard";

    const response = NextResponse.redirect(new URL(safeNext, request.url));

    response.cookies.set(
                            "accessToken", 
                            newAccessToken, 
                            {
                                httpOnly: true,
                                secure: process.env.NODE_ENV === "production",
                                sameSite: "strict" as const,
                                maxAge:60*60
                            }                             
                        );
    response.cookies.set(
                            "refreshToken", 
                            newRefreshToken, 
                            {
                                httpOnly: true,
                                secure: process.env.NODE_ENV === "production",
                                sameSite: "strict" as const,
                                maxAge:7 * 24 * 60 * 60
                            }  
                            );

    return response;
}
  catch (error) {
    return failure("Error refreshing session", 500, error)
}
}
