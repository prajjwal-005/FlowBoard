import { logActivity } from "@/lib/activity";
import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { UpdateSubtaskSchema } from "@/schemas/taskSchema";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { NextRequest } from "next/server";
import * as z from "zod";

const boardColumnTaskIdSchema = z.uuid();

export async function PATCH(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string,taskId:string,subtaskId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session) 
            return failure( 
                "Not authenticated",
                401
            )
        const {boardId,columnId,taskId,subtaskId} = await params;
        const parseBoardId  = boardColumnTaskIdSchema.safeParse(boardId);
        const parseColumnId = boardColumnTaskIdSchema.safeParse(columnId);
        const parseTaskId   = boardColumnTaskIdSchema.safeParse(taskId);
        const parseSubtask  = z.uuid().safeParse(subtaskId)
        if(!parseBoardId.success || !parseColumnId.success || !parseTaskId.success ||!parseSubtask.success)
            return failure(
                "Invalid input",
                400
            )
        const validBoardId  = parseBoardId.data;
        const validColumnId = parseColumnId.data;
        const validTaskId   = parseTaskId.data;
        const validSubtaskId= parseSubtask.data;
        const body = await request.json();
        const parsedBody = UpdateSubtaskSchema.safeParse(body);
        if(!parsedBody.success)
           return failure(
                "Invalid input",
                400
            ) 
        const {title,isCompleted} = parsedBody.data;
        
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
        if(!hasPermission(member.role,"UPDATE_SUBTASK"))
            return failure(
                "Forbidden",
                403
            )           
        if(member.role === "MEMBER" &&taskExist.createdById !== session.userID)
            return failure(
                "Forbidden",
                403
            )           
        const updateSubtask = await prisma.subtask.update({
            where: {
                id:     validSubtaskId,
                taskID: validTaskId
                },
            data:{
                title,isCompleted
            }      
        })

        await logActivity({
            boardID: validBoardId,
            userID: session.userID,
            actorUsername: session.username, 
            action: "SUBTASK_UPDATED",
            entityType: "TASK",
            entityID: taskExist.id,
            entityTitle: taskExist.title,
        })
        return success(
            updateSubtask,
            "Updated subtask successfully",
            200
        ) 
            
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "Subtask not found", 
                404
            );
        return failure(
            "Error updating Subtask",
            500,
            error
        )
    }
}

export async function DELETE(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string,taskId:string,subtaskId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session) 
            return failure( 
                "Not authenticated",
                401
            )
        const {boardId,columnId,taskId,subtaskId} = await params;
        const parseBoardId  = boardColumnTaskIdSchema.safeParse(boardId);
        const parseColumnId = boardColumnTaskIdSchema.safeParse(columnId);
        const parseTaskId   = boardColumnTaskIdSchema.safeParse(taskId);
        const parseSubtaskId  = z.uuid().safeParse(subtaskId);
        if(!parseBoardId.success || !parseColumnId.success || !parseTaskId.success || !parseSubtaskId.success)
            return failure(
                "Invalid input",
                400
            )
        const validBoardId  = parseBoardId.data;
        const validColumnId = parseColumnId.data;
        const validTaskId   = parseTaskId.data
        const validSubtaskId   = parseSubtaskId.data
        
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
        if(!hasPermission(member.role,"DELETE_SUBTASK"))
            return failure(
                "Forbidden",
                403
            )    
        if(member.role === "MEMBER" &&taskExist.createdById !== session.userID)
            return failure(
                "Forbidden",
                403
            )    
          
        await prisma.subtask.delete({
            where: {
                id:     validSubtaskId,
                taskID: validTaskId
                }, 
        })
        await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: "SUBTASK_DELETED",
                entityType: "TASK",
                entityID: taskExist.id,
                entityTitle: taskExist.title,
        })
        
        return success(
            null,
            "Deleted subtask successfully",
            200
        ) 
            
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "Subtask not found", 
                404
            );
        return failure(
            "Error deleting subtask",
            500,
            error
        )
    }
}