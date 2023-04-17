import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import BaseToolGenerationChain, { GenerateToolInput, type BaseToolGenerationChainInput } from 'chains/BaseToolGenerationChain';
export type ExecutorToolGenerationChainInput = BaseToolGenerationChainInput & {
    serpApiKey: string;
};
declare class ExecutorToolGenerationChain extends BaseToolGenerationChain<GenerateToolInput> {
    private serpApiKey;
    private tools;
    constructor(input: ExecutorToolGenerationChainInput);
    getPromptTemplate(): PromptTemplate;
    getChainValues(input: GenerateToolInput): ChainValues;
    getOutputKey(): string;
}
export default ExecutorToolGenerationChain;
//# sourceMappingURL=ExecutorToolGenerationChain.d.ts.map