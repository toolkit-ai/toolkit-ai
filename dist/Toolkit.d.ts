import type { GenerateToolInput } from 'BaseChain';
import { IterateToolInput } from 'IteratorChain';
import type { Tool } from 'lib/types';
export type ToolkitInput = {
    openAIApiKey?: string;
    serpApiKey?: string;
    logToConsole?: boolean;
};
declare class Toolkit {
    private generatorChain;
    private executorChain;
    private iteratorChain;
    constructor(input?: ToolkitInput);
    generateTool(input: GenerateToolInput, withExecutor?: boolean): Promise<Tool>;
    iterateTool(input: IterateToolInput): Promise<Tool>;
    private parseResponse;
}
export default Toolkit;
//# sourceMappingURL=Toolkit.d.ts.map