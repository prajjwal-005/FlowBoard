import { callAI } from "@/lib/ai";
import { AI_OUTPUT_SCHEMAS, AI_PROMPTS } from "@/lib/ai-prompts";
import { failure, success} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { boardIdSchema } from "@/schemas/boardSchema";
import { NextRequest } from "next/server";

export async function POST(request:NextRequest,{params}:{params:Promise<{boardId:string}>}) {
    try {
        const session = await getSession(request);
        if(!session)
            return failure(
                "Not authenticated",
                401
            )
        const {boardId} = await params;
        const parsedBoardId = boardIdSchema.safeParse(boardId);
        if(!parsedBoardId.success)
            return failure(
                "Not valid input",
                400
            )
        const validBoardId = parsedBoardId.data;
        const member = await prisma.boardMember.findUnique({
            where: {
                userID_boardID:{
                    userID:session.userID,
                    boardID:validBoardId
                }
            },
            select:{role:true,userID:true}
        })
        if(!member)
            return failure(
                "Forbidden",
                403
            )

        if(!hasPermission(member?.role,"VIEW_BOARD")){
            return failure(
                "Forbidden",
                403
            )
        }
        const board = await prisma.board.findUnique({
            where: { id: validBoardId },
            select: { name: true,
            columns: {
                select: { title: true,
                tasks: {
                    select: {
                    title: true,
                    priority: true,
                    dueDate: true,
                    taskAssignee: { select: { user: { select: { username: true } } } },
                    subtasks: { select: { isCompleted: true } },
                    },
                },
                },
            },
            },
        })
        if(!board)
            return failure(
                "Not found",
                404
            )
        const input = {
            boardName: board.name,
            columns: board.columns.map((col) => ({
            name: col.title,
            tasks: col.tasks.map((t) => ({
                title: t.title,
                priority: t.priority,
                dueDate: t.dueDate,
                assignees: t.taskAssignee.map((a) => a.user.username),
                subtasksCompleted: t.subtasks.filter((s) => s.isCompleted).length,
                subtasksTotal: t.subtasks.length,
            })),
            })),
        };    
        let summary:string;
        try {
            const result = await callAI(
                            AI_PROMPTS.BOARD_SUMMARY,
                            input,
                            AI_OUTPUT_SCHEMAS.BOARD_SUMMARY.name,
                            AI_OUTPUT_SCHEMAS.BOARD_SUMMARY.zodSchema
                        );
            summary = result.summary;           
        } catch (error) {
            return failure(
                "Error creating board summary",
                502,
                error
            );
        }
        const updated = await prisma.board.update({
            where: { id: validBoardId },
            data: { summary, summaryGeneratedAt: new Date() },
            select: { summary: true, summaryGeneratedAt: true },
        });
        return success(
            updated,
            "successfully updated the board",
            200
        );
    } catch (error) {
        return failure(
                "Error creating board summary",
                500,
                error
            )
    }
}