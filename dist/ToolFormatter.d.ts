import type { BaseTool } from 'lib/types';
declare class ToolFormatter {
    private tool;
    private langchainTemplate;
    constructor(tool: BaseTool);
    private static stringifyJsonSchema;
    private static toLangChainDescription;
    toLangChain(): string;
    toolWithFormats(): {
        langChainCode: string;
        slug: string;
        name: string;
        description: string;
        inputSchema: import("lib/types").JsonObject;
        outputSchema: import("lib/types").JsonObject;
        code: string;
    };
}
export default ToolFormatter;
//# sourceMappingURL=ToolFormatter.d.ts.map