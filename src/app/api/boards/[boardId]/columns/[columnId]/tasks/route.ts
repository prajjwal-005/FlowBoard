import { logActivity } from "@/lib/activity";
import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { toTaskBase } from "@/lib/socket/serialise";
import { CreateTaskSchema } from "@/schemas/taskSchema";
import { emitTaskCreated } from "@/socket/emitters";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { NextRequest } from "next/server";
import * as z from "zod";

const boardAndColumnIdSchema = z.uuid();
export async function POST(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session) 
            return failure( 
                "Not authenticated",
                401
            )
        const {boardId,columnId} = await params;
        const parseBoardId = boardAndColumnIdSchema.safeParse(boardId);
        const parseColumnId = boardAndColumnIdSchema.safeParse(columnId);
        if(!parseBoardId.success || !parseColumnId.success)
            return failure(
                "Invalid input",
                400
            )
        const validBoardId = parseBoardId.data;
        const validColumnId = parseColumnId.data;
        const body = await request.json();
        const parsedBody = CreateTaskSchema.safeParse(body);
        if(!parsedBody.success)
           return failure(
                "Invalid input",
                400
            ) 
        const {title,description,priority,dueDate} = parsedBody.data;
        
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
        if(!hasPermission(member.role,"CREATE_TASK"))
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
        const lastTask = await prisma.task.findFirst({
            where: {
                columnID: validColumnId
            },
            orderBy: {
                order: "desc"
            },
            select: {
                order: true
            }
        });

        const newOrder = (lastTask?.order ?? 0) + 1000;
        const createTask = await prisma.task.create({
            data:{
                title:title,
                description:description,
                priority:priority?? "MEDIUM",
                dueDate:dueDate,
                boardID:validBoardId,
                columnID:validColumnId,
                createdById:session.userID,
                order: newOrder
            }
        })
         await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: "TASK_CREATED",
                entityType: "TASK",
                entityID: createTask.id,
                entityTitle: createTask.title,
            })
            emitTaskCreated(validBoardId, validColumnId, toTaskBase(createTask))
        return success(
            createTask,
            "Created task successfully",
            201
        )    
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "Task not found", 
                404
            );
        return failure(
            "Error creating task",
            500,
            error
        )
    }
}

export async function GET(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session) 
            return failure( 
                "Not authenticated",
                401
            )
        const {boardId,columnId} = await params;
        const parseBoardId = boardAndColumnIdSchema.safeParse(boardId);
        const parseColumnId = boardAndColumnIdSchema.safeParse(columnId);
        if(!parseBoardId.success || !parseColumnId.success)
            return failure(
                "Invalid input",
                400
            )
        const validBoardId = parseBoardId.data;
        const validColumnId = parseColumnId.data;
    
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
        
        const tasks = await prisma.task.findMany({
             where: {
                columnID: validColumnId
            },
            orderBy: {
                order: "asc"
            }
        })
        return success(
            tasks,
            "Fetched all task successfully",
            200
        )    
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "Task not found", 
                404
            );
        return failure(
            "Error fetching task",
            500,
            error
        )
    }
}