import { callAI } from "@/lib/ai";
import { AI_OUTPUT_SCHEMAS,AI_PROMPTS } from "@/lib/ai-prompts";
import { failure, success } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { boardColumnTaskIdSchema } from "@/schemas/taskSchema";
import { NextRequest } from "next/server";
import * as z from "zod"
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; columnId: string; taskId: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) return failure("Not authorised", 401);

    const { boardId, columnId, taskId } = await params;
    const parseBoardId = boardColumnTaskIdSchema.safeParse(boardId);
    const parseColumnId = boardColumnTaskIdSchema.safeParse(columnId);
    const parseTaskId = boardColumnTaskIdSchema.safeParse(taskId);
    if (!parseBoardId.success || !parseColumnId.success || !parseTaskId.success)
      return failure("Invalid Input", 400);

    const validBoardId = parseBoardId.data;
    const validColumnId = parseColumnId.data;
    const validTaskId = parseTaskId.data;

    const boardMember = await prisma.boardMember.findUnique({
      where: {
        userID_boardID: { userID: session.userID, boardID: validBoardId },
      },
    });
    if (!boardMember) return failure("User is not a member of board", 404);
    if (!hasPermission(boardMember.role, "CREATE_SUBTASK")) return failure("Forbidden", 403);

    const task = await prisma.task.findUnique({
      where: { id: validTaskId, boardID: validBoardId, columnID: validColumnId },
      select: {
        title: true,
        description: true,
        subtasks: { select: { title: true } },
      },
    });
    if (!task) return failure("Task not found", 404);

    const input = {
      title: task.title,
      description: task.description,
      existingSubtasks: task.subtasks.map((s) => s.title),
    };

    let suggestions: string[];
    try {
    const result = await callAI(
        AI_PROMPTS.SUBTASK_BREAKDOWN,
        input,
        AI_OUTPUT_SCHEMAS.SUBTASK_BREAKDOWN.name,
        AI_OUTPUT_SCHEMAS.SUBTASK_BREAKDOWN.zodSchema
    );
    suggestions = result.suggestions;
    } catch {
    return failure(
        "Failed to generate subtasks", 
        502
    );
    }
    
    return success({ suggestions },
            "Response fetched successfully",
            200
     );
  } catch (error) {
    return failure("Failed generating subtasks", 500, error);
  }
}