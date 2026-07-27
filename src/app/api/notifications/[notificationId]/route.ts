import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";
import * as z from 'zod';
export async function PATCH(request:NextRequest, {params}:{params:Promise<{notificationId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session)
            return failure(
                "Not authenticated",
                401
            )
        const {notificationId} = await params;
        const notificationSchema = z.uuid()
        const parseNotif = notificationSchema.safeParse(notificationId);
        if(!parseNotif.success)
            return failure(
                "Invalid Input",
                400    
            )
        const validNotifId = parseNotif.data;    

        const notification = await prisma.notification.update({
                where: { 
                   id:     validNotifId,
                   userID: session.userID
                },
                data:{
                    isRead: true,
                }
               
        });



        return success(
                notification,
                "Notification fetched",
                200,
            )
       

    } catch (error) {
        return failure(
            "Error updating board",
            500,
            error
        )
    }
}
