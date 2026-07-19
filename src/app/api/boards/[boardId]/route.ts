import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { updateBoardSchema ,boardIdSchema} from "@/schemas/boardSchema";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

export async function GET(request:NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
    
    try{
        const boardIdSchema = z.uuid();
        const {boardId} = await params;
        const parsed = boardIdSchema.safeParse(boardId);
        if (!parsed.success) {
            return failure(
                "Invalid board id",
                400 
            );
        }
        const validBoardId = parsed.data;
        const session = await getSession(request);
        if(!session)
            return failure(
                "user not Authorised",
                401
            )
        
        const board = await prisma.board.findUnique({
            where: { 
                id: validBoardId 
            },
            include: {
                members: { 
                    where: { 
                        userID: session.userID 
                    }, 
                    select: { role: true } 
                },
                columns: { 
                    orderBy: { order: "asc" }, 
                    include: { 
                        tasks: { 
                            orderBy: { order: "asc" } 
                        } 
                    } 
                },
            },
        });  

        if (!board) {
            return failure("Board not found", 404);
        }

        if (board.members.length === 0) {
            return failure("Unauthorized", 401);
        }

        const { members, ...boardData } = board;

        const shaped = {
            ...boardData,
            role: members[0].role,
        };

        return success(
            shaped,
            "Board fetched successfully",
            200
        );      

    }
    catch(error){
        return failure(
            "Error fetching boardId",
            500,
            error
        )
    }

}
export async function PATCH(request:NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
    try {
        const boardIdSchema = z.uuid();
        const {boardId} = await params;
        const body = await request.json();
        const bodyParsed = updateBoardSchema.safeParse(body)
        if (!bodyParsed.success) {
            return failure(
                "Invalid input",
                400 
            );
        }

        const parsed = boardIdSchema.safeParse(boardId);
        if (!parsed.success) {
            return failure(
                "Invalid board id",
                400 
            );
        }
        const validBoardId = parsed.data;
        const {name,description} = bodyParsed.data;
        const session = await getSession(request);
        if(!session)
            return failure(
                "user not Authorised",
                401
            )
        const member = await prisma.boardMember.findUnique({
            where:{
                userID_boardID:{
                    userID:session.userID,
                    boardID:validBoardId
                }
            }
        })
        if (!member) 
            return failure(
                "Unauthorized", 
                403
            );
        if(!hasPermission(member.role,"UPDATE_BOARD")) 
            return failure(
                "Not allowed",
                403
            )
        const updatedElement = await prisma.board.update({
            where:{
                id: validBoardId,
            },
            data:{
                name,description
            }
        })

        await logActivity({
            boardID: validBoardId,
            userID: session.userID,
            actorUsername: session.username, 
            action: "BOARD_UPDATED",
            entityType: "BOARD",
            entityID:  validBoardId,
            entityTitle: updatedElement.name,
        })
        return success(
            updatedElement,
            "Successfully Updated name and description",
            200
        )
    } catch (error) {
        return failure(
            "Error updating board",
            500,
            error
        )
    }
}


export async function DELETE(request:NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
    try {
        const {boardId} = await params;
       
        const parsed = boardIdSchema.safeParse(boardId);
        if (!parsed.success) {
            return failure(
                "Invalid board id",
                400 
            );
        }
        const validBoardId = parsed.data;
        const session = await getSession(request);
        if(!session)
            return failure(
                "user not Authorised",
                401
            )
        const member = await prisma.boardMember.findUnique({
            where:{
                userID_boardID:{
                    userID:session.userID,
                    boardID:validBoardId
                }
            }
        })
        if (!member) return failure("Unauthorized", 403);


        if(!hasPermission(member.role,"DELETE_BOARD")) 
            return failure(
                "Not allowed",
                403
            )
        await prisma.board.delete({
            where:{
                id: validBoardId,
            }
        })
        
        return success(
            null,
            "Successfully deleted board",
            200
        )
    } catch (error) {
        return failure(
            "Error deleting board",
            500,
            error
        )
    }
    /*
        Prisma throws P2025 if board doesn't exist — unlikely since your member check 
        implicitly confirms the board exists, but if it's deleted between the two queries 
        (race condition), the catch block returns a generic 500 instead of 404. 
        Not critical, but worth knowing.
    */
}
