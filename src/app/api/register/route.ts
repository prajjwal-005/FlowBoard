import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateAccessToken, generateRefreshToken, hashToken } from "@/lib/token";
import { registerSchema } from "@/schemas/registerSchema";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";


export async function POST(request: NextRequest) {
    try {   
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
    return failure("Invalid input", 400);
    }

    const user = parsed.data;
    const existingUsername = await prisma.user.findUnique({
        where:{
            username: user.username,
     }
    })

    if(existingUsername){
        return failure(
            "Username already exist",
            400
        )
    }

    const existingUserByEmail = await prisma.user.findUnique({
        where:{
            email:user.email
        }
    })
    if(existingUserByEmail){
        return failure(
            "Email already exist"
            ,400
        )
    }
    const hashedPassword = await bcrypt.hash(user.password,10)

    const newUser = await prisma.user.create({
        data:{
            username : user.username,
            email: user.email,
            passwordHash:hashedPassword
        }
    })
       
    console.log(newUser.id);

    const accessToken = await generateAccessToken({ userID: newUser.id, email: newUser.email, username:newUser.username });
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.refreshToken.create({
    data: {
        tokenHash: hashedRefreshToken,
        userID: newUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    });

    const response = success(
    { id: newUser.id, username: newUser.username, email: newUser.email },
    "User registered successfully",
    201
    );

    response.cookies.set(
        "accessToken", 
         accessToken, 
         {  httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            sameSite: "strict",
            maxAge: 60* 60,
        });
    response.cookies.set(
        "refreshToken", 
         refreshToken, 
            { httpOnly: true, 
              secure: process.env.NODE_ENV === "production", 
              sameSite: "strict",
              maxAge: 7 * 24 * 60 * 60, 
            });

    return response;
    } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return failure(" Please try different credentials", 409);
    }
    console.error('Error registering user', error);
    return failure(
        "Error registering user", 
        500
    );
}
}
