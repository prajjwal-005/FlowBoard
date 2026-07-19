
import { success, failure } from "@/lib/api";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { logActivity } from "@/lib/activity";

const reorderTaskSchema = z.object({
  taskId:    z.uuid(),
  prevOrder: z.number().int().nullable(),
  nextOrder: z.number().int().nullable(),
});

// ─── Rebalance Helper ────────────────────────────────────────────────────────
// Queries all tasks for the column, places the moved task at the correct
// relative slot in memory using prevOrder as the anchor, then rewrites every
// order value back to clean 1000-gap intervals inside a $transaction.
async function rebalanceTasks(
  boardId: string,
  columnId:string,
  taskId: string,
  prevOrder: number | null
) {
  const tasks = await prisma.task.findMany({
        where: { 
                   boardID:  boardId, 
                   columnID: columnId
                },
        orderBy: { order: "asc" },
  });

  const movedTask= tasks.find((c) => c.id === taskId);
  if (!movedTask) return;

  const rest = tasks.filter((c) => c.id !== taskId);

  // Find insertion index using prevOrder as anchor
  let insertIndex: number;
  if (prevOrder === null) {
    insertIndex = 0; // dropped at absolute top
  } else {
    const prevIdx = rest.findIndex((c) => c.order === prevOrder);
    insertIndex = prevIdx === -1 ? rest.length : prevIdx + 1;
  }

  const reordered = [
    ...rest.slice(0, insertIndex),
    movedTask,
    ...rest.slice(insertIndex),
  ];

  await prisma.$transaction(
    reordered.map((col, idx) =>
      prisma.task.update({
        where: { id: col.id },
        data: { order: (idx + 1) * 1000 },
      })
    )
  );
}

// ─── Route Handler ───────────────────────────────────────────────────────────
export async function POST( request: NextRequest,{ params }: { params: Promise<{ boardId: string ,columnId:string}> }) {
  try {
    const session = await getSession(request);
    if (!session) 
        return failure(
            "Not authenticated", 
            401
        );

    const { boardId,columnId } = await params;
    const body = await request.json();

    const parseBoardId  =  z.uuid().safeParse(boardId);
    const parseColumnId = z.uuid().safeParse(columnId);
    if (!parseBoardId.success || !parseColumnId.success) 
        return failure(
            "Invalid input", 
            400
        );

    const parseBody = reorderTaskSchema.safeParse(body);
    if (!parseBody.success) 
        return failure(
            "Invalid input", 
            400
        );

    const validBoardId  = parseBoardId.data;
    const validColumnId = parseColumnId.data
    const { taskId, prevOrder, nextOrder } = parseBody.data;

    // Auth + permission
    const boardMember = await prisma.boardMember.findUnique({
            where: {
                userID_boardID: {
                boardID: validBoardId,    
                userID: session.userID
                },
            },
        });
    if (!boardMember) 
        return failure(
            "Not authorised", 
            403
        );
    if (!hasPermission(boardMember.role,"UPDATE_TASK"))
        return failure(
            "Not authorised", 
            403
        );

    // Verify column belongs to this board
    const task = await prisma.task.findUnique({
            where: { id: taskId },
        });
    if (!task || task.boardID !== validBoardId||task.columnID !== validColumnId)
        return failure(
            "task not found", 
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
      // Fallback path — integers collapsed, rebalance entire board
      await rebalanceTasks(validBoardId,validColumnId ,taskId, prevOrder);
        return success(
                [], 
                "Task reordered", 
                200
        );
    }

    // Primary path — single row update
    try {
      await prisma.task.update({
            where: { 
                id: taskId, 
                boardID: validBoardId 
            },
            data: { order: newOrder },
      });
      await logActivity({
                boardID: validBoardId,
                userID: session.userID,
                actorUsername: session.username, 
                action: "TASK_REORDERED",
                entityType: "TASK",
                entityID: task.id,
                entityTitle: task.title,
            })
        return success(
                [], 
                "Task reordered", 
                200
        );
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError &&err.code === "P2002") {
        // Unique constraint hit despite collision check passing
        // (client desync) — fall back to rebalance as safety net
        await rebalanceTasks(validBoardId,validColumnId, taskId, prevOrder);
        return success(
            [], 
            "Task reordered", 
            200
        );
      }
      throw err; // re-throw anything else to outer catch
    }
  } catch (error) {
        return failure(
            "Internal server error", 
            500, 
            error
        );
  }
}