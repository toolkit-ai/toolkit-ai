import BaseChain, { BaseChainInput, GenerateToolInput } from 'BaseChain';
import { PromptTemplate } from 'langchain';
import type { ChainValues } from 'langchain/schema';
declare class SimpleChain extends BaseChain<GenerateToolInput> {
    constructor(input: BaseChainInput);
    getPromptTemplate(): PromptTemplate;
    getChainValues(input: GenerateToolInput): ChainValues;
    getOutputKey(): string;
}
export default SimpleChain;
//# sourceMappingURL=SimpleChain.d.ts.map