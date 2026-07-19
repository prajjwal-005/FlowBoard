import { NextRequest} from "next/server";
import { verifyAccessToken } from "./token";

export async function getSession(request: NextRequest): Promise<{ userID: string, email: string ,username: string} | null>{
    try{
        const cookie = request.cookies.get("accessToken")?.value
        
        if(!cookie) return null
        
        const payload = await verifyAccessToken(cookie);
        if(!payload) return null;
    
        return { 
            userID  : payload.userID,
            email   : payload.email,
            username: payload.username
        };
        
}
catch(error){
         console.error('Error verifying session', error)
                return null;
            }
}