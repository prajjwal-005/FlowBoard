import { verifyAccessToken } from "@/lib/token";
import { Socket } from "socket.io";
function parseCookie(raw: string, key: string): string | undefined {
  return raw
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${key}=`))
    ?.split('=')[1];
}
export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
   const rawCookies = socket.handshake.headers.cookie;
   if(!rawCookies)
        return next(new Error('Unauthorized'));


   const accessToken = parseCookie(rawCookies,'accessToken');
   if(!accessToken)
        return next(new Error('Unauthorized'));
   const payload = await verifyAccessToken(accessToken);
   if(!payload)
     return next(new Error('Unauthorized'));

    socket.data.userID = payload.userID;
    socket.data.username = payload.username;
    socket.data.email = payload.email;
    next()
}