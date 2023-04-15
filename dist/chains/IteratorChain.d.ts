import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import BaseChain from 'chains/BaseChain';
import type { ExecutorChainInput } from 'chains/ExecutorChain';
import type { Tool } from 'lib/types';
export type IterateToolInput = {
    tool: Tool;
    logs: string;
};
declare class IteratorChain extends BaseChain<IterateToolInput> {
    private serpApiKey;
    private tools;
    constructor(input: ExecutorChainInput);
    getPromptTemplate(): PromptTemplate;
    getChainValues({ tool, logs }: IterateToolInput): ChainValues;
    getOutputKey(): string;
}
export default IteratorChain;
//# sourceMappingURL=IteratorChain.d.ts.map