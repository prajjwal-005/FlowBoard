import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { boardIdSchema } from "@/schemas/boardSchema";
import { NextRequest } from "next/server";
import { hasPermission } from "@/lib/rbac";

export async function GET(request:NextRequest,{params}:{params : Promise<{boardId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session)
            return failure(
                "Not authenticated",
                401
            )
        const {boardId} = await params;
        const parsedBoardId = boardIdSchema.safeParse(boardId);
        if(!parsedBoardId.success)
            return failure(
                "Invalid input",
                400
            )
        const validBoardId = parsedBoardId.data;    
        const boardMember = await prisma.boardMember.findUnique({
            where:{
                userID_boardID:{
                    userID:  session.userID,
                    boardID: validBoardId
                }
            }
        })
         if (!boardMember) 
            return failure(
                "Unauthorized", 
                403
            );
        if(!hasPermission(boardMember.role,"VIEW_BOARD")) 
            return failure(
                "Not allowed",
                403
            )
        const limit = 20;
        const cursor = request.nextUrl.searchParams.get('cursor');

        const activities = await prisma.activityLog.findMany({
                where: { 
                    boardID: validBoardId 
                },
                take: limit,
                ...(cursor && { skip: 1, cursor: { id: cursor } }),
                orderBy: { createdAt: 'desc' },
        });

        const nextCursor = activities.length === limit ? activities[activities.length - 1].id : null;


        return success(
                { activities, nextCursor },
                "Activity log fetched",
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
  