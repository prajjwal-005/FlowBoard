// import { failure } from "@/lib/api";
// import { getSession } from "@/lib/session";
// import { NextRequest } from "next/server";
// import { boardIdSchema } from "@/schemas/boardSchema";
// import { prisma } from "@/lib/prisma";
// import { hasPermission } from "@/lib/rbac";

// export async function POST(request:NextRequest,{params}:{params:Promise<{boardId:string}>}) {
//     try {
//         const session = await getSession(request);
//         if(!session)
//             return failure(
//                 "Not authenticated",
//                 401
//             )

//         const {boardId} = await params;
//         const body      = await request.json();
//         const parseBoardId = boardIdSchema.safeParse(boardId);
//         if(!parseBoardId.success){
//             return failure(
//                 "Invalid input",
//                 400
//             )
//         }
//         const {columnId,prevOrder,nextOrder}
//         const validBoardId = parseBoardId.data;
//         const boardMember = await prisma.boardMember.findUnique({
//             where:{
//                 userID_boardID:{
//                     userID:session.userID,
//                     boardID:validBoardId
//                 }
//             }
//         })
//         if(!boardMember)
//             return failure(
//                 "Not authorised",
//                 403
//             )
//         if(!hasPermission(boardMember.role,"UPDATE_COLUMN"))
//             return failure(
//                 "Not authorised",
//                 403
//             )

//     } catch (error) {
        
//     }
    
// }

import { success, failure } from "@/lib/api";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { logActivity } from "@/lib/activity";
import { emitColumnReordered } from "@/socket/emitters";

const reorderColumnSchema = z.object({
  columnId: z.string().uuid(),
  prevOrder: z.number().int().nullable(),
  nextOrder: z.number().int().nullable(),
});

// ─── Rebalance Helper ────────────────────────────────────────────────────────
// Queries all columns for the board, places the moved column at the correct
// relative slot in memory using prevOrder as the anchor, then rewrites every
// order value back to clean 1000-gap intervals inside a $transaction.
async function rebalanceColumns(boardId: string, columnId: string, prevOrder: number | null) {
  const columns = await prisma.column.findMany({
    where: { boardID: boardId },
    orderBy: { order: "asc" },
  });

  const movedColumn = columns.find((c) => c.id === columnId);
  if (!movedColumn) return [];

  const rest = columns.filter((c) => c.id !== columnId);

  let insertIndex: number;
  if (prevOrder === null) {
    insertIndex = 0;
  } else {
    const prevIdx = rest.findIndex((c) => c.order === prevOrder);
    insertIndex = prevIdx === -1 ? rest.length : prevIdx + 1;
  }

  const reordered = [
    ...rest.slice(0, insertIndex),
    movedColumn,
    ...rest.slice(insertIndex),
  ];

  await prisma.$transaction(
    reordered.map((c, idx) =>
      prisma.column.update({
        where: { id: c.id },
        data: { order: (idx + 1) * 1000 },
      })
    )
  );

  return reordered.map((c, idx) => ({ id: c.id, order: (idx + 1) * 1000 }));
}

// ─── Route Handler ───────────────────────────────────────────────────────────
export async function POST( request: NextRequest,{ params }: { params: Promise<{ boardId: string }> }) {
  try {
    const session = await getSession(request);
    if (!session) 
        return failure(
            "Not authenticated", 
            401
        );

    const { boardId } = await params;
    const body = await request.json();

    const parseBoardId = z.uuid().safeParse(boardId);
    if (!parseBoardId.success) 
        return failure(
            "Invalid input", 
            400
        );

    const parseBody = reorderColumnSchema.safeParse(body);
    if (!parseBody.success) 
        return failure(
            "Invalid input", 
            400
        );

    const validBoardId = parseBoardId.data;
    const { columnId, prevOrder, nextOrder } = parseBody.data;

    // Auth + permission
    const boardMember = await prisma.boardMember.findUnique({
            where: {
                userID_boardID: {
                userID: session.userID,
                boardID: validBoardId,
                },
            },
        });
    if (!boardMember) 
        return failure(
            "Not authorised", 
            403
        );
    if (!hasPermission(boardMember.role, "UPDATE_COLUMN"))
        return failure(
            "Not authorised", 
            403
        );

    // Verify column belongs to this board
    const column = await prisma.column.findUnique({
            where: { id: columnId },
        });
    if (!column || column.boardID !== validBoardId)
        return failure(
            "Column not found", 
            404
        );

    // ── Calculate newOrder ──────────────────────────────────────────────────
    let newOrder: number;
    if (prevOrder === null && nextOrder === null) {
      newOrder = 1000; // only column on board
    } else if (prevOrder === null) {
      newOrder = nextOrder! - 1000; // dropped at absolute top
    } else if (nextOrder === null) {
      newOrder = prevOrder + 1000; // dropped at absolute bottom
    } else {
      newOrder = Math.floor((prevOrder + nextOrder) / 2); // midpoint
    }

    // ── Collision check ─────────────────────────────────────────────────────
    const isCollision =
      (prevOrder !== null &&
        nextOrder !== null &&
        Math.abs(nextOrder - prevOrder) <= 1) ||
      newOrder === prevOrder ||
      newOrder === nextOrder;

    if (isCollision) {
        const updatedColumns = await rebalanceColumns(validBoardId, columnId, prevOrder);
        emitColumnReordered(validBoardId, updatedColumns);
        return success([], "Column reordered", 200);
    }

    try {
        await prisma.column.update({
            where: { id: columnId, boardID: validBoardId },
            data: { order: newOrder },
    });

    await logActivity({
        boardID: validBoardId,
        userID: session.userID,
        actorUsername: session.username, 
        action: "COLUMN_REORDERED",
        entityType: "COLUMN",
        entityID: column.id,
        entityTitle: column.title,
    })
    emitColumnReordered(validBoardId, [{ id: columnId, order: newOrder }]);
    return success([], "Column reordered", 200);
    } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
        const updatedColumns = await rebalanceColumns(validBoardId, columnId, prevOrder);
        emitColumnReordered(validBoardId, updatedColumns);
        return success([], "Column reordered", 200);
    }
    throw err;
    }

  } catch (error) {
        return failure(
            "Internal server error", 
            500, 
            error
        );
  }
}