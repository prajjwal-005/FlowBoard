import { logActivity } from "@/lib/activity";
import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { toComment } from "@/lib/socket/serialise";
import { UpdateCommentSchema } from "@/schemas/taskSchema";
import { emitCommentDeleted, emitCommentUpdated } from "@/socket/emitters";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { NextRequest } from "next/server";
import * as z from "zod";

const boardColumnTaskIdSchema = z.uuid();

export async function PATCH(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string,taskId:string,commentId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session) 
            return failure( 
                "Not authenticated",
                401
            )
        const {boardId,columnId,taskId,commentId} = await params;
        const parseBoardId  = boardColumnTaskIdSchema.safeParse(boardId);
        const parseColumnId = boardColumnTaskIdSchema.safeParse(columnId);
        const parseTaskId   = boardColumnTaskIdSchema.safeParse(taskId);
        const parseCommentId  = z.uuid().safeParse(commentId)
        if(!parseBoardId.success || !parseColumnId.success || !parseTaskId.success ||!parseCommentId.success)
            return failure(
                "Invalid input",
                400
            )
        const validBoardId   = parseBoardId.data;
        const validColumnId  = parseColumnId.data;
        const validTaskId    = parseTaskId.data;
        const validCommentId = parseCommentId.data;
        const body = await request.json();
        const parsedBody = UpdateCommentSchema.safeParse(body);
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
        
        
        const comment = await prisma.comment.findUnique({
            where:{
                id:     validCommentId,
                taskID: validTaskId,
            }
        })  
        if(!comment)
            return failure(
                "No comment exist",
                404
            )
        
        if (!hasPermission(member.role,"UPDATE_COMMENT"))
            return failure(
                "Forbidden", 
                403
            );              
        if (comment.userID !== session.userID )
            return failure(
                "Forbidden", 
                403
            );              
        const updateComment = await prisma.comment.update({
            where: {
                id:     validCommentId,
                taskID: validTaskId,
                userID: member.userID
                },
            data:{
                content,
            },
            include:{
                user:{
                    select:{username:true, avatarUrl:true}
                }
            }          
        })

        emitCommentUpdated(validBoardId, validTaskId, toComment(updateComment))

        return success(
            updateComment,
            "Updated comment successfully",
            200
        ) 
            
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "comment not found", 
                404
            );
        return failure(
            "Error updating comment",
            500,
            error
        )
    }
}

export async function DELETE(request:NextRequest, {params}:{params:Promise<{boardId:string,columnId:string,taskId:string,commentId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session) 
            return failure( 
                "Not authenticated",
                401
            )
        const {boardId,columnId,taskId,commentId} = await params;
        const parseBoardId    = boardColumnTaskIdSchema.safeParse(boardId);
        const parseColumnId   = boardColumnTaskIdSchema.safeParse(columnId);
        const parseTaskId     = boardColumnTaskIdSchema.safeParse(taskId);
        const parseCommentId  = z.uuid().safeParse(commentId);
        if(!parseBoardId.success || !parseColumnId.success || !parseTaskId.success || !parseCommentId.success)
            return failure(
                "Invalid input",
                400
            )
        const validBoardId   = parseBoardId.data;
        const validTaskId    = parseTaskId.data
        const validCommentId = parseCommentId.data
        
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
        
        const comment = await prisma.comment.findUnique({
            where:{
                id:     validCommentId,
                taskID: validTaskId,
            }
        })  
        if(!comment)
            return failure(
                "No comment exist",
                404
            );
        if (!hasPermission(member.role,"DELETE_COMMENT"))
            return failure(
                "Forbidden", 
                403
            );        
        if ( (member.role === "MEMBER" || member.role==="ADMIN" )&& comment.userID !== session.userID )
            return failure(
                "Forbidden", 
                403
            );        
        await prisma.comment.delete({
            where: {
                id    : validCommentId,
                taskID: validTaskId
                }, 
        })

       await logActivity({
            boardID: validBoardId,
            userID: session.userID,
            actorUsername: session.username, 
            action: "COMMENT_DELETED",
            entityType: "TASK",
            entityID: validTaskId,
            entityTitle: comment.content,
        })
        emitCommentDeleted(validBoardId, validTaskId, validCommentId);
        return success(
            null,
            "Deleted comment successfully",
            200
        ) 
            
            

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError&& error.code === "P2025")
            return failure(
                "comment not found", 
                404
            );
        return failure(
            "Error deleting comment",
            500,
            error
        )
    }
}