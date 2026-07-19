import * as z from "zod";

// ==========================================
// 1. BASE SCHEMA (Contains all shared fields)
// ==========================================
export const TaskBaseSchema = z.object({
  title: z.string({ error: "Title is required" })
    .trim()
    .min(1, { error: "Title cannot be empty" })
    .max(200, { error: "Title must be under 200 characters" }),

  description: z.string()
    .trim()
    .max(2000, { error: "Description must be under 2000 characters" })
    .optional(),

  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),

  // z.coerce.date() automatically converts incoming strings/ISO strings into a JavaScript Date object
  dueDate: z.coerce.date().nullable().optional(),

  order: z.number().nonnegative({ error: "Order must be a positive number" }).optional(),

  columnID: z.string().uuid({ error: "Invalid column ID format" }).optional(),
});

export const CreateTaskSchema = TaskBaseSchema.omit({
  order: true,
  columnID: true,
});


export const UpdateTaskSchema = TaskBaseSchema.partial().refine(
    d => Object.values(d).some(v => v !== undefined),
    { message: "At least one field required" }
).refine(
    d => d.columnID === undefined || d.order !== undefined,
    { message: "order is required when columnID is provided" }
)

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// COMMENTS

// Shared field definition
const contentValidation = z.string({ error: "Content is required" })
  .trim()
  .min(1, { error: "Comment cannot be empty" })
  .max(2000, { error: "Comment must be under 2000 characters" });

// POST Schema
export const CreateCommentSchema = z.object({
  content: contentValidation,
});

// PATCH Schema (Clean & simplified — no redundant refinement needed)
export const UpdateCommentSchema = z.object({
  content: contentValidation,
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;


//ASSIGNEE


export const AssigneeSchema = z.object({
  userID: z.string().uuid({ error: "Invalid user ID format" }),
});

export type AssigneeInput = z.infer<typeof AssigneeSchema>;

//SUBTASK

// Base fields
const subtaskFields = {
  title: z.string({ error: "Title is required" })
    .trim()
    .min(1, { error: "Title cannot be empty" })
    .max(200, { error: "Title must be under 200 characters" }),
  isCompleted: z.boolean().default(false),
};

// POST Schema (Only requires title)
export const CreateSubtaskSchema = z.object({
  title: subtaskFields.title,
});

// PATCH Schema (Both optional, but at least one must be sent)
export const UpdateSubtaskSchema = z.object({
  title: subtaskFields.title.optional(),
  isCompleted: subtaskFields.isCompleted.optional(),
}).refine(
  (data) => data.title !== undefined || data.isCompleted !== undefined,
  {
    error: "You must provide either 'title' or 'isCompleted' to update.",
    path: [], // Sets the error at the root level of the object
  }
);

export type CreateSubtaskInput = z.infer<typeof CreateSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof UpdateSubtaskSchema>;

export const boardColumnTaskIdSchema = z.uuid();

