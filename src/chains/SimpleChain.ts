/* eslint-disable class-methods-use-this */
import Handlebars from 'handlebars';
import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';

import BaseChain, { BaseChainInput, GenerateToolInput } from 'chains/BaseChain';
import { readTemplate } from 'lib/util';

class SimpleChain extends BaseChain<GenerateToolInput> {
  constructor(input: BaseChainInput) {
    super(input);
    this.chain = this.newLlmChain();
  }

  override getPromptTemplate(): PromptTemplate {
    const toolSpec = readTemplate('tool-spec.txt');
    const template = Handlebars.compile(
      readTemplate('generate-tool-prompt.hbs')
    )({ toolSpec });
    return new PromptTemplate({
      template,
      inputVariables: ['generateToolInput'],
    });
  }

  override getChainValues(input: GenerateToolInput): ChainValues {
    return { generateToolInput: JSON.stringify(input) };
  }

  override getOutputKey(): string {
    return 'text';
  }
}

export default SimpleChain;
