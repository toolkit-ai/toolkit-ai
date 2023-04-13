import { LLMChain, OpenAI, PromptTemplate } from 'langchain';
import { ConsoleCallbackHandler } from 'langchain/callbacks';
import type { BaseChain as BaseLangChain } from 'langchain/chains';
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

abstract class BaseChain<T> {
  private openAIApiKey: string;

  private logToConsole: boolean;

  protected chain!: BaseLangChain;

  constructor(input: BaseChainInput) {
    this.openAIApiKey = input.openAIApiKey;
    this.logToConsole = input.logToConsole;
  }

  async generate(input: T) {
    const outputKey = this.getOutputKey();
    const chainValues = this.getChainValues(input);

    const consoleCallbackHandler = new ConsoleCallbackHandler({
      alwaysVerbose: true,
    });
    if (this.logToConsole) {
      this.chain.callbackManager.addHandler(consoleCallbackHandler);
    }

    const responseValues = await this.chain.call(chainValues);
    const responseString = responseValues[outputKey];
    if (!responseString) {
      throw new Error(
        `value "${outputKey}" not returned from chain call, got values: ${responseValues}`
      );
    }

    if (this.logToConsole) {
      this.chain.callbackManager.removeHandler(consoleCallbackHandler);
    }
    return responseString;
  }

  abstract getPromptTemplate(): PromptTemplate;

  abstract getChainValues(input: T): ChainValues;

  abstract getOutputKey(): string;

  protected newLlmChain() {
    const llm = new OpenAI({
      modelName: 'gpt-4',
      temperature: 0,
      openAIApiKey: this.openAIApiKey,
    });
    const prompt = this.getPromptTemplate();
    return new LLMChain({ llm, prompt });
  }
}

export default BaseChain;
