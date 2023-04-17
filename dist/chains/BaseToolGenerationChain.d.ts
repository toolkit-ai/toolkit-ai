import { LLMChain, type BaseChain } from 'langchain/chains';
import type { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import type { JsonObject } from 'lib/types';
export type BaseToolGenerationChainInput = {
    openAIApiKey: string;
    logToConsole: boolean;
};
export type GenerateToolInput = {
    name: string;
    description: string;
    inputSchema?: JsonObject | undefined;
    outputSchema?: JsonObject | undefined;
};
declare abstract class BaseToolGenerationChain<T> {
    private openAIApiKey;
    private logToConsole;
    protected chain: BaseChain;
    constructor(input: BaseToolGenerationChainInput);
    generate(input: T): Promise<any>;
    abstract getPromptTemplate(): PromptTemplate;
    abstract getChainValues(input: T): ChainValues;
    abstract getOutputKey(): string;
    protected newLlmChain(): LLMChain;
}
export default BaseToolGenerationChain;
//# sourceMappingURL=BaseToolGenerationChain.d.ts.map