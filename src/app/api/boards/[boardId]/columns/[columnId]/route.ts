import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client"; 
import * as z from "zod";
import { logActivity } from "@/lib/activity";
import { emitColumnDeleted, emitColumnRenamed } from "@/socket/emitters";
const columnSchema  = z.object({
    title: z.string().min(1).max(100).trim(),
    order: z.number().nonnegative()
});
const patchColumnSchema = columnSchema.partial().refine(
    d => d.title !== undefined || d.order !== undefined,
    { message: "At least one field required" }
);


const boardAndColumnIdSchema = z.uuid();
export async function PATCH(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string}>}) {
    try {
    
    const session = await getSession(request);
        if(!session) 
            return failure(
                "not Authorised",
                401
            )
        const {boardId,columnId} = await params;
        const parseBoardId = boardAndColumnIdSchema.safeParse(boardId);
        if(!parseBoardId.success) 
        return failure(
            "Invalid Input",
            400
        )
        const parseColumnId = boardAndColumnIdSchema.safeParse(columnId);
        if(!parseColumnId.success) 
        return failure(
            "Invalid Input",
            400
        )
        const body = await request.json();
        const parsedBody = patchColumnSchema.safeParse(body);
        if(!parsedBody.success) 
        return failure(
            "Invalid Input",
            400
        )
        const {title,order} = parsedBody.data;
        const validBoardId  = parseBoardId.data;
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
        if(!hasPermission(member.role,"UPDATE_COLUMN"))
            return failure(
                "Forbidden",
                403
            )
        const updatedColumn = await prisma.column.update({
            where:{
                id:validColumnId,
                boardID:validBoardId,
            },
            data:{
                title:title,
                order:order
            }
        })

        await logActivity({
            boardID: validBoardId,
            userID: session.userID,
            actorUsername: session.username, 
            action: "COLUMN_RENAMED",
            entityType: "COLUMN",
            entityID:  updatedColumn.id,
            entityTitle: updatedColumn.title,
        })
        if (title !== undefined) {
            emitColumnRenamed(validBoardId, validColumnId, updatedColumn.title)
        }
        return success(
            updatedColumn,
            "Updated column successfully",
            200
        )
        
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2025")
        return failure(
            "Column not found", 
            404
        );
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2002")
        return failure(
            "Order already taken", 
            409
        );
        return failure(
            "Error updating column",
            500,
            error
        )
    }
}


export async function DELETE(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string}>}) {
    try {
    
    const session = await getSession(request);
        if(!session) 
            return failure(
                "not Authorised",
                401
            )
        const {boardId,columnId} = await params;
        const parseBoardId = boardAndColumnIdSchema.safeParse(boardId);
        if(!parseBoardId.success) 
        return failure(
            "Invalid Input",
            400
        )
        const parseColumnId = boardAndColumnIdSchema.safeParse(columnId);
        if(!parseColumnId.success) 
        return failure(
            "Invalid Input",
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
        if(!hasPermission(member.role,"DELETE_COLUMN"))
            return failure(
                "Forbidden",
                403
            )
            
        
        const column = await prisma.column.findUnique({
            where:{
                boardID: validBoardId,
                id     : validColumnId
            }
        })
        if(!column)
            return failure(
            "Column not found", 
            404
        );
          
            await prisma.column.delete({
                where:{
                    id:validColumnId,
                    boardID:validBoardId,
                }
            });
            
        
        await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: "COLUMN_DELETED",
                entityType: "COLUMN",
                entityID: validColumnId,
                entityTitle: column.title,
            })
        emitColumnDeleted(validBoardId,validColumnId);   
           
        return success(
            null,
            "Deleted column successfully",
            200
        )
        
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2025")
        return failure(
            "Column not found", 
            404
        );
        return failure(
            "Error deleting column",
            500,
            error
        )
    }
}