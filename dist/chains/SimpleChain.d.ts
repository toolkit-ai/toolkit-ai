import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import BaseChain, { BaseChainInput, GenerateToolInput } from 'chains/BaseChain';
declare class SimpleChain extends BaseChain<GenerateToolInput> {
    constructor(input: BaseChainInput);
    getPromptTemplate(): PromptTemplate;
    getChainValues(input: GenerateToolInput): ChainValues;
    getOutputKey(): string;
}
export default SimpleChain;
//# sourceMappingURL=SimpleChain.d.ts.map