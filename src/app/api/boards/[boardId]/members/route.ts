import { logActivity } from "@/lib/activity";
import { failure, success } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { emitMemberAdded, emitMemberRemoved, emitMemberRoleChanged } from "@/socket/emitters";
import { NextRequest } from "next/server";
import * as z from "zod"

const addMemberSchema = z.object({
     identifier: z.string().min(1).refine(
        val => z.email().safeParse(val).success || /^[a-z][a-z0-9_]{2,19}$/.test(val),
        { message: "Must be a valid email or username" }
     ).trim()
});
const updateRoleSchema = z.object({
    identifier: z.string().min(1),
    role: z.enum(["ADMIN", "MEMBER", "VIEWER"]) 
});
export async function GET(request:NextRequest,{params}:{params :Promise<{boardId:string}>}) {
    try {
       const boardIdSchema = z.uuid();
       const {boardId} = await params;
       const parseBoardId = boardIdSchema.safeParse(boardId);
       if(!parseBoardId.success) 
        return failure(
            "Invalid Input",
            400
        )
        const session = await getSession(request);
        if(!session) 
        return failure(
            "unauthorised User",
            401
        )
        const validBoardId = parseBoardId.data;
        const board = await prisma.board.findUnique({
            where: {
                id: validBoardId,
                members: {
                some: {
                    userID: session.userID,
                },
                },
            },
            select: {
                members: {
                select: {
                    userID: true,
                    role: true,
                    user: {                     // add this
                        select: {
                            username: true,
                            avatarUrl: true
                        }
                    }
                },
            },
        },
        });

        if (!board) {
        return failure(
            "Board not found or access denied", 
            404);
        }

        return success(
            board.members, 
            "Members fetched", 
                        200);

       
    } catch (error) {
        return failure(
            "Error fetching board members",
            500,
            error
        )
    }  
}

export async function POST(request:NextRequest,{params}:{params :Promise<{boardId:string}>}) {
       try {
            const boardIdSchema = z.uuid();
            const {boardId} = await params;
            const parseBoardId = boardIdSchema.safeParse(boardId);
            if(!parseBoardId.success) 
                return failure(
                    "Invalid Input",
                    400
                )
            const session = await getSession(request);     
            if(!session) 
                return failure(
                    "Invalid",
                    401
                )
            const body = await request.json(); 
            const parsedBody = addMemberSchema.safeParse(body);
            
            if(!parsedBody.success) 
                return failure(
                    "Invalid Input",
                    400
                )
            
               
            const validBoardId = parseBoardId.data;
            const {identifier}   = parsedBody.data;
            
            const requesterMember = await prisma.boardMember.findUnique({
                where: { 
                        userID_boardID: { 
                            userID: session.userID, 
                            boardID: validBoardId 
                        } 
                    }
            });
            if (!requesterMember) return failure("Unauthorized", 401);

            if (!hasPermission(requesterMember.role, "ADD_MEMBER")) return failure("Not allowed", 403);
            
            const targetUser  = await prisma.user.findFirst({
                where:{
                    OR:[
                        {username:identifier},
                        {email:identifier}
                    ]
                }
            });
            if(!targetUser) return failure("User Not Found", 404)

            const alreadyMember = await prisma.boardMember.findUnique({
                where: { 
                    userID_boardID: { 
                        userID: targetUser.id, 
                        boardID: validBoardId 
                    } }
            });
            if (alreadyMember) return failure("User is already a member", 400);   
            const newMember = await prisma.boardMember.create({
                data:{
                    userID: targetUser.id,
                    boardID: validBoardId
                },
                include:{
                    user:{
                        select:{username:true,avatarUrl:true,id:true}
                    }
                }
            })
 
            await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: "MEMBER_ADDED",
                entityType: "BOARD",
                entityID:  validBoardId,
                entityTitle: targetUser.username,
            })
            emitMemberAdded(validBoardId, { userID:newMember.userID, role: newMember.role, user: { username: targetUser.username, avatarUrl: targetUser.avatarUrl } })
            createNotification({ userID: newMember.userID, actorID: session.userID, type: 'MEMBER_ADDED', message: `Memebr added ${targetUser.username}`, boardID: validBoardId, entityType: 'BOARD', entityID: validBoardId })
            return success(
                newMember,
                "member added successfully",
                201
            )


       } catch (error) {
            return failure(
            "Error adding board members",
            500,
            error
        )
       } 
}

export async function PATCH(request:NextRequest,{params}:{params :Promise<{boardId:string}>}) {
    try {
        const boardIdSchema = z.uuid();
        const {boardId} = await params;
        const parseBoardId = boardIdSchema.safeParse(boardId);
        if(!parseBoardId.success) 
            return failure(
                "Invalid Input",
                400
            )
        const session = await getSession(request);     
        if(!session) 
            return failure(
                "Invalid",
                401
            )
        const body = await request.json(); 
        const parsedBody = updateRoleSchema.safeParse(body);
        
        if(!parsedBody.success) 
            return failure(
                "Invalid Input",
                400
            )
            
        const validBoardId      = parseBoardId.data;
        const {identifier,role} = parsedBody.data;

        const requesterMember = await prisma.boardMember.findUnique({
                where: { 
                        userID_boardID: { 
                            userID: session.userID, 
                            boardID: validBoardId 
                        } 
                    }
            });
        if (!requesterMember) 
            return failure(
                "Unauthorized", 
                401
            );

        if (!hasPermission(requesterMember.role, "CHANGE_ROLE")) 
            return failure(
                "Not allowed", 
                403
            );
        const targetUser  = await prisma.user.findFirst({
                where:{
                    OR:[
                        {username:identifier},
                        {email:identifier}
                    ]
                }
            });

        if(!targetUser) 
            return failure(
                "User Not Found", 
                404
            );
        const targetMember = await prisma.boardMember.findUnique({
            where:{
                userID_boardID:{
                    userID:targetUser.id,
                    boardID:validBoardId
                }
            }
        })
        if (!targetMember) 
            return failure(
                "User is not a member", 
                404
            );    
        if (targetMember.role === "OWNER") 
            return failure(
                "Cannot change owner's role", 
                403
            );
        const updateRole = await prisma.boardMember.update({
            where:{
                userID_boardID:{
                    userID:targetUser.id,
                    boardID:validBoardId
                }
            },data:{
                role:role
            }
        })
        await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: "MEMBER_ROLE_CHANGED",
                entityType: "BOARD",
                entityID:  validBoardId,
                entityTitle: targetUser.username,
        })   
        emitMemberRoleChanged(validBoardId, updateRole.userID, updateRole.role)
        createNotification({ userID: targetMember.userID, actorID: session.userID, type: 'ROLE_CHANGED', message: `Memebr role changed: ${targetUser.username}`, boardID: validBoardId, entityType: 'BOARD', entityID: validBoardId })

        return success(
            updateRole,
            "updated role successfully",
            200
        )    

    } catch (error) {
        return failure(
            "Error updating member role",
            500,
            error
        )
    }
}

export async function DELETE(request:NextRequest,{params}:{params :Promise<{boardId:string}>}) {
    try {
        const boardIdSchema = z.uuid();
        const {boardId} = await params;
        const parseBoardId = boardIdSchema.safeParse(boardId);
        if(!parseBoardId.success) 
            return failure(
                "Invalid Input",
                400
            )
        const session = await getSession(request);     
        if(!session) 
            return failure(
                "Invalid",
                401
            )
        const body = await request.json(); 
        const parsedBody = addMemberSchema.safeParse(body);
        
        if(!parsedBody.success) 
            return failure(
                "Invalid Input",
                400
            )
            
        const validBoardId = parseBoardId.data;
        const {identifier} = parsedBody.data;

        const requesterMember = await prisma.boardMember.findUnique({
                where: { 
                        userID_boardID: { 
                            userID: session.userID, 
                            boardID: validBoardId 
                        } 
                    }
            });
        if (!requesterMember) 
            return failure(
                "Unauthorized", 
                401
            );

        if (!hasPermission(requesterMember.role, "REMOVE_MEMBER")) 
            return failure(
                "Not allowed", 
                403
            );
        const targetUser  = await prisma.user.findFirst({
                where:{
                    OR:[
                        {username:identifier},
                        {email:identifier}
                    ]
                }
            });

        if(!targetUser) 
            return failure(
                "User Not Found", 
                404
            );
        if(targetUser.id === session.userID) 
            return failure(
                "Cannot remove yourself", 
                403
            );     
        const targetMember = await prisma.boardMember.findUnique({
            where:{
                userID_boardID:{
                    userID:targetUser.id,
                    boardID:validBoardId
                }
            }
        })
        if (!targetMember) 
            return failure(
                "User is not a member", 
                404
            ); 
        if (targetMember.role === "OWNER") 
            return failure(
                "Cannot remove the board owner", 
                403
            );    
            
        await prisma.boardMember.delete({
            where:{
                userID_boardID:{
                    userID:targetUser.id,
                    boardID:validBoardId
                }
            }
        })  
        
        await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: "MEMBER_REMOVED",
                entityType: "BOARD",
                entityID:  validBoardId,
                entityTitle: targetUser.username,
        })
        emitMemberRemoved(validBoardId, targetUser.id)
        
        createNotification({ userID: targetMember.userID, actorID: session.userID, type: "MEMBER_REMOVED", message: `Memebr Removed: ${targetUser.username}`, boardID: validBoardId, entityType: 'BOARD', entityID: validBoardId })

        return success(
            [],
            "Deleted member successfully",
            200
        )
    } catch (error) {
        return failure(
            "Error deleting member ",
            500,
            error
        )
    }
}

