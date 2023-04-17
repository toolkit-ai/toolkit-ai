import type { GenerateToolInput } from 'chains/BaseToolGenerationChain';
import type { Tool } from 'lib/types';
type ToolIteratorInput = {
    openAIApiKey: string;
    serpApiKey: string;
    verbose?: boolean;
    maxIterations?: number;
};
declare class ToolIterator {
    private toolkit;
    private openAIApikey;
    private verbose;
    private maxIterations;
    constructor({ openAIApiKey, serpApiKey, verbose, maxIterations, }: ToolIteratorInput);
    iterate(input: GenerateToolInput): Promise<Tool>;
    private log;
    private generateInitialTool;
    private runTool;
    private reviseTool;
}
export default ToolIterator;
//# sourceMappingURL=ToolIterator.d.ts.map