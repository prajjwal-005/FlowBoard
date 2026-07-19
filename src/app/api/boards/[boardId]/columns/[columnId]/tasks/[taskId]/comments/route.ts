import { logActivity } from "@/lib/activity";
import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { CreateCommentSchema } from "@/schemas/taskSchema";
import { NextRequest } from "next/server";
import * as z from "zod";
const boardColumnTaskIdSchema = z.uuid();

export async function POST(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string,taskId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session) 
            return failure( 
                "Not authenticated",
                401
            )
        const {boardId,columnId,taskId} = await params;
        const parseBoardId  = boardColumnTaskIdSchema.safeParse(boardId);
        const parseColumnId = boardColumnTaskIdSchema.safeParse(columnId);
        const parseTaskId   = boardColumnTaskIdSchema.safeParse(taskId);
        if(!parseBoardId.success || !parseColumnId.success || !parseTaskId.success)
            return failure(
                "Invalid input",
                400
            )
        const validBoardId  = parseBoardId.data;
        const validColumnId = parseColumnId.data;
        const validTaskId   = parseTaskId.data
        const body = await request.json();
        const parsedBody = CreateCommentSchema.safeParse(body);
        if(!parsedBody.success)
           return failure(
                "Invalid input",
                400
            ) 
        const {content} = parsedBody.data;
        
        const member = await prisma.boardMember.findUnique({
            where:{
                userID_boardID:{
                    userID:session.userID,
                    boardID:validBoardId
                }    
            }
        })
        if(!member)
            return failure( 
                "not Authorised",
                403
            )
        if(!hasPermission(member.role,"CREATE_COMMENT"))
            return failure(
                "Forbidden",
                403
            )
        
        
        const taskExist = await prisma.task.findUnique({
            where:{
                id:validTaskId,
                columnID:validColumnId,
                boardID:validBoardId
            }
        })  
        if(!taskExist)
            return failure(
                "No task exist",
                404
            )  
        const createComment = await prisma.comment.create({
            data:{
                content,
                taskID:validTaskId,
                userID:session.userID
            }        
        })

        await logActivity({
            boardID: validBoardId,
            userID: session.userID,
            actorUsername: session.username, 
            action: "COMMENT_CREATED",
            entityType: "TASK",
            entityID: taskExist.id,
            entityTitle: taskExist.title,
        })
        return success(
            createComment,
            "Created comment successfully",
            201
        ) 
            
            

    } catch (error) {
        
        return failure(
            "Error creating comment",
            500,
            error
        )
    }
}

