import BaseChain, { GenerateToolInput, type BaseChainInput } from 'BaseChain';
import { PromptTemplate } from 'langchain';
import type { ChainValues } from 'langchain/schema';
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