import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI();

export async function callAI<T extends z.ZodType>(  instructions: string,  input: object,schemaName: string,zodSchema: T): Promise<z.infer<T>> {
  const response = await client.responses.create({
    model: "gpt-5-nano-2025-08-07",
    reasoning: { effort: "low" },
    instructions,
    input: JSON.stringify(input),
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema: z.toJSONSchema(zodSchema),
      },
    },
  });

  const parsed = zodSchema.safeParse(JSON.parse(response.output_text));
  if (!parsed.success) {
    throw new Error("AI response failed schema validation");
  }
  return parsed.data;
}