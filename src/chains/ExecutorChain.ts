/* eslint-disable class-methods-use-this */
import Handlebars from 'handlebars';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import { SerpAPI, Tool as LangChainTool } from 'langchain/tools';

import BaseChain, {
  GenerateToolInput,
  type BaseChainInput,
} from 'chains/BaseChain';
import { readTemplate } from 'lib/util';
import NpmInfo from 'tools/NpmInfo';
import NpmSearch from 'tools/NpmSearch';

export type ExecutorChainInput = BaseChainInput & {
  serpApiKey: string;
};

class ExecutorChain extends BaseChain<GenerateToolInput> {
  private serpApiKey: string;

  private tools: LangChainTool[];

  constructor(input: ExecutorChainInput) {
    super(input);
    this.serpApiKey = input.serpApiKey;
    this.tools = [new NpmSearch(), new NpmInfo(), new SerpAPI(this.serpApiKey)];

    const llmChain = this.newLlmChain();
    const agent = new ZeroShotAgent({
      llmChain,
    });
    this.chain = new AgentExecutor({
      tools: this.tools,
      agent,
    });
  }

  override getPromptTemplate(): PromptTemplate {
    const toolSpec = readTemplate('tool-spec.txt');
    const generateToolPrompt = Handlebars.compile(
      readTemplate('generate-tool-prompt.hbs')
    )({ toolSpec });
    const template = Handlebars.compile(readTemplate('executor-prompt.hbs'))({
      prompt: generateToolPrompt,
    });
    return new PromptTemplate({
      template,
      inputVariables: [
        'generateToolInput',
        'tools',
        'toolNames',
        'agent_scratchpad',
      ],
    });
  }

  override getChainValues(input: GenerateToolInput): ChainValues {
    return {
      generateToolInput: JSON.stringify(input),
      tools: this.tools
        .map(({ name, description }) => `${name}: ${description}`)
        .join('\n'),
      toolNames: this.tools.map(({ name }) => name).join(', '),
    };
  }

  override getOutputKey(): string {
    return 'output';
  }
}

export default ExecutorChain;
