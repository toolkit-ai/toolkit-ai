import type { JsonObject, Tool } from 'lib/types';
export type ToolkitInput = {
    openAIApiKey?: string;
};
export type GenerateToolInput = {
    name: string;
    description: string;
    inputSchema?: JsonObject | undefined;
    outputSchema?: JsonObject | undefined;
};
declare class Toolkit {
    private static generatePrompt;
    private generatorChain;
    constructor(input?: ToolkitInput);
    private static newGeneratorChain;
    generateTool(input: GenerateToolInput): Promise<Tool>;
}
export default Toolkit;
//# sourceMappingURL=Toolkit.d.ts.map