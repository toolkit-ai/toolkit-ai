import type { z } from 'zod';

import type { GeneratedToolSchema } from './schemas';

// These types are defined specifically to be
// compatible with generated Prisma types
export type JsonValue =
  | string
  | number
  | boolean
  | JsonObject
  | JsonArray
  | null;
export interface JsonArray extends Array<JsonValue> {}
export type JsonObject = { [Key in string]?: JsonValue };

export type GeneratedTool = z.infer<typeof GeneratedToolSchema>;
export type BaseTool = {
  slug: string;
  name: string;
  description: string;
  inputSchema: JsonObject;
  outputSchema: JsonObject;
  code: string;
};
export type Tool = BaseTool & {
  langChainCode: string;
};
