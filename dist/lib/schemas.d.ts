import { z } from 'zod';
import type { JsonValue } from 'lib/types';
export declare const JsonPrimitiveSchema: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
export declare const JsonValueSchema: z.ZodType<JsonValue>;
export declare const JsonObjectSchema: z.ZodRecord<z.ZodString, z.ZodType<JsonValue, z.ZodTypeDef, JsonValue>>;
export declare const GeneratedToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    inputSchema: z.ZodRecord<z.ZodString, z.ZodType<JsonValue, z.ZodTypeDef, JsonValue>>;
    outputSchema: z.ZodRecord<z.ZodString, z.ZodType<JsonValue, z.ZodTypeDef, JsonValue>>;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    description: string;
    inputSchema: Record<string, JsonValue>;
    outputSchema: Record<string, JsonValue>;
}, {
    code: string;
    name: string;
    description: string;
    inputSchema: Record<string, JsonValue>;
    outputSchema: Record<string, JsonValue>;
}>;
//# sourceMappingURL=schemas.d.ts.map