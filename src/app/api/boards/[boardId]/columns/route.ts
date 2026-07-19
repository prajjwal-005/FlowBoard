import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { boardIdSchema } from "@/schemas/boardSchema";
import * as z from "zod";
import { logActivity } from "@/lib/activity";

export const columnSchema  = z.object({
    title: z.string().min(1).max(100).trim()
});

export async function POST(request:NextRequest,{params}:{params:Promise<{boardId:string}>}) {
    try {                                       
        const session = await getSession(request);
        if(!session) 
            return failure(
                "not Authorised",
                401
            )
        const {boardId} = await params;
        const parseBoardId = boardIdSchema.safeParse(boardId);
        if(!parseBoardId.success) 
        return failure(
            "Invalid Input",
            400
        )
        const body = await request.json();
        const parsedBody = columnSchema.safeParse(body);
        if(!parsedBody.success) 
        return failure(
            "Invalid Input",
            400
        )
        const {title} = parsedBody.data;
        const validBoardId = parseBoardId.data;
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
        if(!hasPermission(member.role,"CREATE_COLUMN"))
            return failure(
                "Forbidden",
                403
            )
        const maxOrderResult = await prisma.column.aggregate({
            where: { boardID: validBoardId },
            _max: { order: true }
        });
        const maxOrder = maxOrderResult._max.order;
        const newOrder = (maxOrder?? 0) +1000;    
        const column = await prisma.column.create({
            data:{
                title:title,
                boardID:validBoardId,
                order: newOrder,
                createdById:session.userID,

            }
        })  
        
        await logActivity({
            boardID: validBoardId,
            userID: session.userID,
            actorUsername: session.username, 
            action: "COLUMN_CREATED",
            entityType: "COLUMN",
            entityID:  column.id,
            entityTitle: column.title,
        })
       
        return success( 
            column,
            "Created column successfully",
            201
        )     
    } catch (error) {
        return failure(
            "Error creating column",
            500,
            error
        )
    }
}

export async function GET(request:NextRequest,{params}:{params:Promise<{boardId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session) 
            return failure(
                "not Authenticated",
                401
            )
        const {boardId} = await params;
        const parseBoardId = boardIdSchema.safeParse(boardId);
        if(!parseBoardId.success) 
        return failure(
            "Invalid Input",
            400
        )
       
        const validBoardId = parseBoardId.data;
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
        const columns = await prisma.column.findMany({
            where:{
                boardID:validBoardId,   
            },
            include: {
                tasks: { orderBy: { order: "asc" } }
            },
            orderBy: { order: "asc" }
        })
        if(columns.length === 0)
            return success(
                [],
                "No column exist",
                200
            )
        return success(
            columns,
            "Fetched all columns",
            200
        )            
    } catch (error) {
        return failure(
            "Error fetching column",
            500,
            error
        )
    }
}