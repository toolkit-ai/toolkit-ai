import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import BaseToolGenerationChain, { BaseToolGenerationChainInput, GenerateToolInput } from 'chains/BaseToolGenerationChain';
declare class SimpleToolGenerationChain extends BaseToolGenerationChain<GenerateToolInput> {
    constructor(input: BaseToolGenerationChainInput);
    getPromptTemplate(): PromptTemplate;
    getChainValues(input: GenerateToolInput): ChainValues;
    getOutputKey(): string;
}
export default SimpleToolGenerationChain;
//# sourceMappingURL=SimpleToolGenerationChain.d.ts.map