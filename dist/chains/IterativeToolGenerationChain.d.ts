import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import BaseToolGenerationChain from 'chains/BaseToolGenerationChain';
import type { ExecutorToolGenerationChainInput } from 'chains/ExecutorToolGenerationChain';
import type { Tool } from 'lib/types';
export type IterateToolInput = {
    tool: Tool;
    logs: string;
};
declare class IterativeToolGenerationChain extends BaseToolGenerationChain<IterateToolInput> {
    private serpApiKey;
    private tools;
    constructor(input: ExecutorToolGenerationChainInput);
    getPromptTemplate(): PromptTemplate;
    getChainValues({ tool, logs }: IterateToolInput): ChainValues;
    getOutputKey(): string;
}
export default IterativeToolGenerationChain;
//# sourceMappingURL=IterativeToolGenerationChain.d.ts.map