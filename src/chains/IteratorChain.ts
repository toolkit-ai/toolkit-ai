/* eslint-disable class-methods-use-this */
import Handlebars from 'handlebars';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import { SerpAPI, Tool as LangChainTool } from 'langchain/tools';

import BaseChain from 'chains/BaseChain';
import type { ExecutorChainInput } from 'chains/ExecutorChain';
import type { Tool } from 'lib/types';
import { readTemplate } from 'lib/util';
import NpmInfo from 'tools/NpmInfo';
import NpmSearch from 'tools/NpmSearch';

export type IterateToolInput = {
  tool: Tool;
  logs: string;
};

class IteratorChain extends BaseChain<IterateToolInput> {
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
    const iterateToolPrompt = Handlebars.compile(
      readTemplate('iterate-tool-prompt.hbs')
    )({
      toolSpec,
    });
    const template = Handlebars.compile(readTemplate('executor-prompt.hbs'))({
      prompt: iterateToolPrompt,
    });
    return new PromptTemplate({
      template,
      inputVariables: [
        'tool',
        'runLogs',
        'tools',
        'toolNames',
        'agent_scratchpad',
      ],
    });
  }

  override getChainValues({ tool, logs }: IterateToolInput): ChainValues {
    return {
      tool: JSON.stringify(tool),
      runLogs: logs,
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

export default IteratorChain;
