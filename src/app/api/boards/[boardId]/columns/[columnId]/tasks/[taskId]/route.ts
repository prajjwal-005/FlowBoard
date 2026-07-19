import { logActivity } from "@/lib/activity";
import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { UpdateTaskSchema } from "@/schemas/taskSchema";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { NextRequest } from "next/server";
import * as z from "zod";

export const boardColumnTaskIdSchema = z.uuid();
export async function GET(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string,taskId:string}>}) {
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
        if(!hasPermission(member.role,"VIEW_BOARD"))
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
        const task = await prisma.task.findUnique({
            where: {
                id: validTaskId,
                columnID: validColumnId,
                boardID: validBoardId,
            },
            include: {
                subtasks: true,
                comments: {
                    include: { user: { select: { username: true, avatarUrl: true } } },
                    orderBy: { createdAt: "asc" },
                },
                taskAssignee: {
                    include: { user: { select: { username: true, avatarUrl: true } } },
                },
                createdBy: { select: { username: true } }
            },
        });

        if (!task)
            return failure("Task not found", 404);

        const { taskAssignee, ...taskData } = task;

        return success(
            { ...taskData, assignees: taskAssignee },
            "Fetched task successfully",
            200
        );
        
            
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "Task not found", 
                404
            );
        return failure(
            "Error getting task",
            500,
            error
        )
    }
}
export async function PATCH(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string,taskId:string}>}) {
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
        const parsedBody = UpdateTaskSchema.safeParse(body);
        if(!parsedBody.success)
           return failure(
                "Invalid input",
                400
            ) 
        const {title,description,priority,dueDate,order,columnID} = parsedBody.data;
        
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
        if(!hasPermission(member.role,"UPDATE_TASK"))
            return failure(
                "Forbidden",
                403
            )
        if(columnID){
            const newColumn = await prisma.column.findUnique({
                where: { 
                    id: columnID, 
                    boardID: validBoardId }
            })
            if(!newColumn) return failure(
                "Target column not found", 
                400
            );
        } 
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
            ); 
        if (member.role === "MEMBER" && taskExist.createdById !== session.userID)
            return failure(
                "Forbidden", 
                    403
                );     
        const task = await prisma.task.update({
            where: {
                id:       validTaskId,
                columnID: validColumnId,
                boardID:  validBoardId,
                },
            data:{
                title,description,dueDate,order,columnID,priority
            }    
        })

        await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: body.columnID ? "TASK_MOVED" : "TASK_UPDATED",
                entityType: "TASK",
                entityID: task.id,
                entityTitle: task.title,
            })
        return success(
            task,
            "Updated task successfully",
            200
        ) 
            
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "Task not found", 
                404
            );
        return failure(
            "Error updating task",
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
        if(!hasPermission(member.role,"DELETE_TASK"))
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
        await prisma.task.delete({
            where: {
                id:       validTaskId,
                columnID: validColumnId,
                boardID:  validBoardId,
                }  
        })

        await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: "TASK_DELETED",
                entityType: "TASK",
                entityID: taskExist.id,
                entityTitle: taskExist.title,
            })
        return success(
            null,
            "Deleted task successfully",
            200
        ) 
            
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "Task not found", 
                404
            );
        return failure(
            "Error deleting task",
            500,
            error
        )
    }
}
