import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { failure, success } from "@/lib/api";
import { boardSchema } from "@/schemas/boardSchema";
import { logActivity } from "@/lib/activity";
export async function POST(request:NextRequest) {
   try{
     const session = await getSession(request);
     if(!session) return failure(
        "Unauthorized",
        401
    )
    const body = await request.json();
    const parsed = boardSchema.safeParse(body)
    if(!parsed.success) return failure("Invalid input",400);

    const {name,description} = parsed.data
    
    const board = await prisma.$transaction (async(tx) => {
        const board = await tx.board.create({
            data:{
                name,
                description,
                createdById: session.userID,
            }
        });
        await tx.boardMember.create({
            data:{
                userID: session.userID,
                boardID: board.id,
                role: "OWNER"
            }
        })
        return board;
    })

    await logActivity({
        boardID: board.id,
        userID: session.userID,
        actorUsername: session.username, 
        action: "BOARD_CREATED",
        entityType: "BOARD",
        entityID:  board.id,
        entityTitle: board.name,
    })

    return success(
        board,
        "Board created successfully",
        201,

    )
   }
catch(error){
    console.error("failed to create board ",error);
    return failure(
            "Error creating board",
            500
        )
}   
}

export async function GET(request:NextRequest) {
    try{
        const session = await getSession(request);
        if(!session) return failure(
            "Unauthorized",
            401
        )
        
        const boards = await prisma.board.findMany({
            where: {
                members: {
                    some: { userID: session.userID },
                },
            },
            include: {
                members: {
                    where: { userID: session.userID },
                    select: { role: true },
                },
            },
        });
        const shaped = boards.map((b) => ({
            ...b,
            role: b.members[0]?.role,
            members: undefined,
        }));
                
        if (shaped.length === 0) {
            return success(
                [],
                "No boards found",
                200
            );
        }

        return success(
            shaped,
            "Found boards for user",
            200
        )
    }
    catch(error){
        return failure(
            "Error finding boards",
            500,
            error
        )
    }

    
}
