import { z } from "zod";

export type AIAction = "SUBTASK_BREAKDOWN" | "DESCRIPTION_EXPANSION" | "BOARD_SUMMARY";


export const AI_PROMPTS: Record<AIAction, string> = {
SUBTASK_BREAKDOWN: `You are a project management assistant. Given a task's title, description, and existing subtasks, suggest 3-6 new subtask titles that break the task into concrete, actionable steps.

Rules:
- Do not duplicate any existing subtask (case-insensitive, similar meaning counts as duplicate).
- Each title must be short and actionable (max 100 characters).
- Base suggestions only on the given title/description — do not invent unrelated work.
- If existing subtasks already cover the task well, return fewer suggestions, even zero.`,
    DESCRIPTION_EXPANSION: `You are a project management assistant. Given a task's title and an optional current description, write a clear, well-structured task description.

Rules:
- If a current description is provided, expand and refine it — do not discard existing intent or details.
- If no current description is provided, write one from the title alone.
- Keep it concise: 2-4 sentences or a short bullet list, max 500 characters.
- Do not invent specific technical details, names, or numbers not implied by the title/description.
- Plain, professional tone — no filler like "This task involves...".`,
BOARD_SUMMARY: `You are a project management assistant. Given a board's name and its columns with tasks (title, priority, due date, assignees, subtask progress), write a concise summary of the board's current state.

Rules:
- 3-6 sentences, plain prose (no bullet lists, no headers).
- Mention overall progress, any overdue or high-priority items, and notable bottlenecks (e.g. a column with many unassigned or stalled tasks).
- Do not invent details not present in the data — if data is sparse, keep the summary short rather than padding it.
- Do not mention specific usernames unless relevant to a highlighted risk (e.g. an overloaded assignee).
- Max 600 characters.`,
};

const SubtaskBreakdownOutputSchema = z.object({
    suggestions: z.array(z.string().min(1).max(150)),
});
const DescriptionExpansionOutputSchema = z.object({
    description: z.string().min(1).max(2000),
});
const BoardSummaryOutputSchema = z.object({
summary: z.string().min(1).max(1000),
});


export const AI_OUTPUT_SCHEMAS = {
SUBTASK_BREAKDOWN: {
    name: "subtask_breakdown",
    zodSchema: SubtaskBreakdownOutputSchema,
},
DESCRIPTION_EXPANSION: {
name: "description_expansion",
zodSchema: DescriptionExpansionOutputSchema,
},
BOARD_SUMMARY: {
name: "board_summary",
zodSchema: BoardSummaryOutputSchema,
},
} satisfies Record<AIAction, { name: string; zodSchema: z.ZodType }>;

