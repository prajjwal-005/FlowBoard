import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { boardColumnTaskIdSchema } from "@/schemas/taskSchema";
import { callAI } from "@/lib/ai";
import { AI_OUTPUT_SCHEMAS, AI_PROMPTS } from "@/lib/ai-prompts";

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
            },
            select:{id:true,title:true,description:true,createdById:true}
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
        const input = {
            title: taskExist.title,
            currentDescription: taskExist.description
        }
        let suggestions:string;
        try{
            const result = await callAI(
                AI_PROMPTS.DESCRIPTION_EXPANSION,
                input,
                AI_OUTPUT_SCHEMAS.DESCRIPTION_EXPANSION.name,
                AI_OUTPUT_SCHEMAS.DESCRIPTION_EXPANSION.zodSchema
            )
        suggestions = result.description;
        }catch {
            return failure(
                "Failed to generate description", 
                502
            );
        }
        return success({ 
            description: suggestions 
        }) 
      
    } catch (error) {
        return failure(
            "Error generating description",
            500,
            error
        )
    }
}