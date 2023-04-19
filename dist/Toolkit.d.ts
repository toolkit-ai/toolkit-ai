import type { GenerateToolInput } from 'chains/BaseToolGenerationChain';
import { IterateToolInput } from 'chains/IterativeToolGenerationChain';
import type { Tool } from 'lib/types';
export type ToolkitInput = {
    openAIApiKey?: string;
    serpApiKey?: string;
    modelName?: string;
    logToConsole?: boolean;
};
declare class Toolkit {
    private simpleToolGenerationChain;
    private executorToolGenerationChain;
    private iterativeToolGenerationChain;
    constructor(input?: ToolkitInput);
    generateTool(input: GenerateToolInput, withExecutor?: boolean): Promise<Tool>;
    iterateTool(input: IterateToolInput): Promise<Tool>;
    private parseResponse;
}
export default Toolkit;
//# sourceMappingURL=Toolkit.d.ts.map