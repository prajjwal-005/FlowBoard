import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateAccessToken, generateRefreshToken, hashToken } from "@/lib/token";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/schemas/loginSchema";


export async function POST(request: Request) {
    try {   
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
    return failure("Invalid input", 400);
    }

    const user = parsed.data;
     const existingUsernameOrEmail = await prisma.user.findFirst({
        where:{
           OR: [
            {username: user.identifier}, 
            {email: user.identifier}
        ]
     }
    })

    if(!existingUsernameOrEmail){
        return failure(
            "Invalid credentials",
            401
        )
    }

    
    const password = user.password;
    const hashPassword = existingUsernameOrEmail.passwordHash

    const check = await bcrypt.compare(password,hashPassword);
    if(!check){
        return failure(
            "Invalid credentials",
            401
        )
    }
       
    console.log(existingUsernameOrEmail.id);

    const accessToken = await generateAccessToken({ userID: existingUsernameOrEmail.id, email: existingUsernameOrEmail.email, username:existingUsernameOrEmail.username });
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.$transaction([
         prisma.refreshToken.deleteMany({
            where:{
                userID: existingUsernameOrEmail.id
            }
        }),
         prisma.refreshToken.create({
            data: {
                tokenHash: hashedRefreshToken,
                userID: existingUsernameOrEmail.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            }),
    ]);
   

    const response = success(
    { id: existingUsernameOrEmail.id, username: existingUsernameOrEmail.username, email: existingUsernameOrEmail.email },
    "User logged in successfully",
    200
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
        console.error('Error logging user', error)
        return failure(
            "Error logging user",
            500
        )
    }
}
