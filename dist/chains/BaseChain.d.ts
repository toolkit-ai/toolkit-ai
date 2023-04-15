import { LLMChain, type BaseChain as BaseLangChain } from 'langchain/chains';
import type { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import type { JsonObject } from 'lib/types';
export type BaseChainInput = {
    openAIApiKey: string;
    logToConsole: boolean;
};
export type GenerateToolInput = {
    name: string;
    description: string;
    inputSchema?: JsonObject | undefined;
    outputSchema?: JsonObject | undefined;
};
declare abstract class BaseChain<T> {
    private openAIApiKey;
    private logToConsole;
    protected chain: BaseLangChain;
    constructor(input: BaseChainInput);
    generate(input: T): Promise<any>;
    abstract getPromptTemplate(): PromptTemplate;
    abstract getChainValues(input: T): ChainValues;
    abstract getOutputKey(): string;
    protected newLlmChain(): LLMChain;
}
export default BaseChain;
//# sourceMappingURL=BaseChain.d.ts.map