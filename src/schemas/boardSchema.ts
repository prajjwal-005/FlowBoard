import * as z from "zod";

export const boardSchema = z.object({
    name: z.string()
            .min(1, { message: "Board name must be at least 1 character" })
            .max(100, { message: "Board name must be at most 100 characters" })
            .trim(),
    description: z.string()
                  .max(1000,{ message: "Board description must be at most 1000 characters" })
                  .trim()
                  .optional()
});

export const updateBoardSchema = boardSchema
    .partial()
    .refine(
        d => d.name !== undefined || d.description !== undefined,
        { message: "At least one field required" }
    )
export const boardIdSchema = z.uuid();    
