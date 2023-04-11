import type { JsonObject, Tool } from 'lib/types';
export type ToolkitInput = {
    openAIApiKey?: string;
    serpApiKey?: string;
};
export type GenerateToolInput = {
    name: string;
    description: string;
    inputSchema?: JsonObject | undefined;
    outputSchema?: JsonObject | undefined;
};
declare class Toolkit {
    private openAIApiKey;
    private serpApiKey;
    private tools;
    private generatorChain;
    private executorChain;
    constructor(input?: ToolkitInput);
    generateTool(input: GenerateToolInput, withExecutor?: boolean): Promise<Tool>;
    private newLlmChain;
    private constructGeneratorChain;
    private constructExecutorChain;
    private callGenerator;
    private callExecutor;
}
export default Toolkit;
//# sourceMappingURL=Toolkit.d.ts.map