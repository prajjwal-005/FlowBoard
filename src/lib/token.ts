import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

if (!process.env.JWT_SECRET) 
    throw new Error(
        "JWT_SECRET is not set"
    );
const secret = new TextEncoder().encode(
    process.env.JWT_SECRET!
)
export type AccessTokenPayload = {
    userID  :string;
    email   :string;
    username:string;
}
export async function generateAccessToken( payload: AccessTokenPayload) {
    return await new SignJWT(payload)
            .setProtectedHeader({alg:"HS256"})
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(secret)
}
export function generateRefreshToken() {
    return crypto.randomBytes(32).toString("hex")
   
}
// export async function verifyAccessToken( token:string):Promise<AccessTokenPayload>  {
//     const {payload} = await jwtVerify(
//         token,
//         secret
//     )
//     return payload as AccessTokenPayload;
// }
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        
        // Cast to 'any' temporarily so TypeScript allows the property checks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = payload as any; 
        
        if (typeof data.userID !== "string" || typeof data.email !== "string" ||  typeof data.username !== "string") {
            throw new Error("Invalid token payload structure");
        }
        
        // TypeScript safely infers the return type here
        return {
            userID:   data.userID,
            email:    data.email,
            username: data.username,
        };
    } catch (error) {
        console.error("JWT verification failed:", error);
        return null; // Safely returns null to getSession if anything fails or throws
    }
}
export function hashToken(token: string) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}