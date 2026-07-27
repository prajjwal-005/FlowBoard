import { logActivity } from "@/lib/activity";
import { failure, success } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { AssigneeSchema} from "@/schemas/taskSchema";
import { emitAssigneeAdded, emitAssigneeRemoved } from "@/socket/emitters";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
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
        const parsedBody = AssigneeSchema.safeParse(body);
        if(!parsedBody.success)
           return failure(
                "Invalid input",
                400
            ) 
        const {userID} = parsedBody.data;
        const targetUser = await prisma.user.findUnique({
            where: { 
                id: userID 
            },
            select: { 
                id: true, 
                username: true,
                avatarUrl:true 
            } 
        });
        if(!targetUser) return failure(
            "User does not exist", 
            404
        );
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
        if(!hasPermission(member.role,"ASSIGN_MEMBER"))
            return failure(
                "Forbidden",
                403
            )
        
        const boardMember = await prisma.boardMember.findUnique({
            where: { 
                userID_boardID:{
                    userID:userID,
                    boardID:validBoardId
                } }
        })
        if(!boardMember) return failure(
            "User is not a board member", 
            400
        );
        
        const validColumn = await prisma.column.findUnique({
                where:{
                    id:validColumnId,
                    boardID:validBoardId
                }
        })
        if(!validColumn)
            return failure( 
                "Invalid input",
                400
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
        const assignee = await prisma.taskAssignee.create({
            data:{
                userID,
                taskID:validTaskId
            },
            include:{
                user:{
                    select:{username:true, avatarUrl:true}
                }
            }
                
            
        })
        await logActivity({
            boardID: validBoardId,
            userID: session.userID,
            actorUsername: session.username, 
            action: "ASSIGNEE_ADDED",
            entityType: "TASK",
            entityID: validTaskId,
            entityTitle: targetUser.username,
        })
        emitAssigneeAdded(validBoardId, validTaskId, { userID, taskID: validTaskId, createdAt: assignee.createdAt.toISOString(), user: { username: targetUser.username, avatarUrl: targetUser.avatarUrl } })
        createNotification({ userID: userID, actorID: session.userID, type: 'TASK_ASSIGNED', message: `${session.username} assigned you to "${taskExist.title}"`, boardID: validBoardId, entityType: 'TASK', entityID: taskExist.id })
        return success(
            assignee,
            "Created assignee successfully",
            201
        ) 
            
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2002")
            return failure(
                "already exist", 
                409
            );
        return failure(
            "Error creating assignee",
            500,
            error
        )
    }
}


export async function DELETE(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string,taskId:string}>}) {
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
        const parsedBody = AssigneeSchema.safeParse(body);
        if(!parsedBody.success)
           return failure(
                "Invalid input",
                400
            ) 
        const {userID} = parsedBody.data;
        const targetUser = await prisma.user.findUnique({
            where: { 
                id: userID 
            },
            select: { 
                id: true, 
                username: true 
            } 
        });
        if(!targetUser) return failure(
            "User does not exist", 
            404
        );
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
        if(!hasPermission(member.role,"ASSIGN_MEMBER"))
            return failure(
                "Forbidden",
                403
            )
        
        
        
        const validColumn = await prisma.column.findUnique({
                where:{
                    id:validColumnId,
                    boardID:validBoardId
                }
        })
        if(!validColumn)
            return failure( 
                "Invalid input",
                400
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
        await prisma.taskAssignee.delete({
           where:{
                taskID_userID:{
                    taskID:validTaskId,
                    userID:userID
                }
           }  
        })
        await logActivity({
            boardID: validBoardId,
            userID: session.userID,
            actorUsername: session.username, 
            action: "ASSIGNEE_REMOVED",
            entityType: "TASK",
            entityID: validTaskId,
            entityTitle: targetUser.username,
        })

        emitAssigneeRemoved(validBoardId, validTaskId, userID);
        return success(
            null,
            "Deleted assignee successfully",
            200
        ) 
            
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "Doesn't exist", 
                404
            );
        return failure(
            "Error deleting assignee",
            500,
            error
        )
    }
}