import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import BaseChain, { GenerateToolInput, type BaseChainInput } from 'chains/BaseChain';
export type ExecutorChainInput = BaseChainInput & {
    serpApiKey: string;
};
declare class ExecutorChain extends BaseChain<GenerateToolInput> {
    private serpApiKey;
    private tools;
    constructor(input: ExecutorChainInput);
    getPromptTemplate(): PromptTemplate;
    getChainValues(input: GenerateToolInput): ChainValues;
    getOutputKey(): string;
}
export default ExecutorChain;
//# sourceMappingURL=ExecutorChain.d.ts.map