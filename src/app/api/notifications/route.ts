import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";

export async function GET(request:NextRequest) {
    try {
        const session = await getSession(request);
        if(!session)
            return failure(
                "Not authenticated",
                401
            )
           
        const limit = 20;
        const cursor = request.nextUrl.searchParams.get('cursor');

        const notification = await prisma.notification.findMany({
                where: { 
                   userID:session.userID
                },
                take: limit,
                ...(cursor && { skip: 1, cursor: { id: cursor } }),
                orderBy: { createdAt: 'desc' },
        });

        const nextCursor = notification.length === limit ? notification[notification.length - 1].id : null;


        return success(
                { notifications: notification, nextCursor },
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
