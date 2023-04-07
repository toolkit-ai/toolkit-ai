import { z } from 'zod';

import type { JsonValue } from 'lib/types';

export const JsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    JsonPrimitiveSchema,
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ])
);

export const JsonObjectSchema = z.record(JsonValueSchema);

export const GeneratedToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: JsonObjectSchema,
  outputSchema: JsonObjectSchema,
  code: z.string(),
});
