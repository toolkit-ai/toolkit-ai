import { readFileSync } from 'fs';

import slugify from '@sindresorhus/slugify';
import ToolFormatter from 'ToolFormatter';
import Handlebars from 'handlebars';
import { LLMChain, OpenAI } from 'langchain';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';
import { SerpAPI, Tool as LangChainTool } from 'langchain/tools';

import { GeneratedToolSchema } from 'lib/schemas';
import type { GeneratedTool, JsonObject, BaseTool, Tool } from 'lib/types';
import { resolveFromSrc } from 'lib/util';
import NpmInfo from 'tools/NpmInfo';
import NpmSearch from 'tools/NpmSearch';

export type ToolkitInput = {
  openAIApiKey?: string;
  serpApiKey?: string;
  modelName?: string;
};

export type GenerateToolInput = {
  name: string;
  description: string;
  inputSchema?: JsonObject | undefined;
  outputSchema?: JsonObject | undefined;
};

class Toolkit {
  private openAIApiKey: string | undefined;

  private serpApiKey: string | undefined;

  private modelName: string;

  private tools: LangChainTool[];

  // Chain used to generate tool without use of other tools
  private generatorChain!: LLMChain;

  // Chain used to generate tool using an agent that executes other tools
  private executorChain!: AgentExecutor;

  constructor(input?: ToolkitInput) {
    this.openAIApiKey = input?.openAIApiKey;
    this.serpApiKey = input?.serpApiKey;
    this.modelName = input?.modelName || 'gpt-4';

    this.tools = [new NpmSearch(), new NpmInfo(), new SerpAPI(this.serpApiKey)];

    const generatorPromptText = readFileSync(
      resolveFromSrc('templates/generate-tool-prompt.txt')
    ).toString();
    this.constructGeneratorChain(generatorPromptText);
    this.constructExecutorChain(generatorPromptText);
  }

  // Primary public method used to generate a tool,
  // with or without an agent executing helper tools
  async generateTool(
    input: GenerateToolInput,
    withExecutor = false
  ): Promise<Tool> {
    // Call appropriate chain
    const responseString: string = withExecutor
      ? await this.callExecutor(input)
      : await this.callGenerator(input);

    // Parse response into JSON object
    let responseObject: any;
    try {
      responseObject = JSON.parse(responseString);
    } catch (err) {
      throw new Error(
        `value "text" could not be parsed as JSON: ${responseString}`
      );
    }

    // Ensure the resulting object fits expected schema
    const generatedTool: GeneratedTool =
      GeneratedToolSchema.parse(responseObject);

    // Add slug as an identifier
    const baseTool: BaseTool = {
      slug: slugify(generatedTool.name),
      ...generatedTool,
    };

    // Add formats to tool
    const tool: Tool = new ToolFormatter(baseTool).toolWithFormats();
    return tool;
  }

  private newLlmChain(prompt: PromptTemplate) {
    const llm = new OpenAI({
      modelName: this.modelName,
      temperature: 0,
      ...(this.openAIApiKey ? { openAIApiKey: this.openAIApiKey } : {}),
    });
    return new LLMChain({ llm, prompt });
  }

  private constructGeneratorChain(generatorPromptText: string) {
    const generatorPromptTemplate = new PromptTemplate({
      template: generatorPromptText,
      inputVariables: ['generateToolInput'],
    });
    this.generatorChain = this.newLlmChain(generatorPromptTemplate);
  }

  private constructExecutorChain(generatorPromptText: string) {
    const executorPromptText = Handlebars.compile(
      readFileSync(resolveFromSrc('templates/executor-prompt.hbs')).toString()
    )({ generateToolPrompt: generatorPromptText });
    const executorPromptTemplate = new PromptTemplate({
      template: executorPromptText,
      inputVariables: [
        'generateToolInput',
        'tools',
        'toolNames',
        'agent_scratchpad',
      ],
    });

    const llmChain = this.newLlmChain(executorPromptTemplate);
    const agent = new ZeroShotAgent({
      llmChain,
    });
    this.executorChain = new AgentExecutor({
      tools: this.tools,
      agent,
    });
  }

  private async callGenerator(input: GenerateToolInput): Promise<string> {
    // Call LLM chain with our prompt and receive response
    const generatorResponseValues: ChainValues = await this.generatorChain.call(
      {
        generateToolInput: JSON.stringify(input),
      }
    );

    // Pick relevant field from response
    const { text: responseString } = generatorResponseValues;
    if (!responseString) {
      throw new Error(
        `value "text" not returned from OpenAPI LLM chain, got values: ${generatorResponseValues}`
      );
    }
    return responseString;
  }

  private async callExecutor(input: GenerateToolInput): Promise<string> {
    // Call LLM chain with our prompt and receive response
    const executorResponseValues = await this.executorChain.call({
      generateToolInput: JSON.stringify(input),
      tools: this.tools
        .map(({ name, description }) => `${name}: ${description}`)
        .join('\n'),
      toolNames: this.tools.map(({ name }) => name).join(', '),
    });

    // Pick relevant field from response
    const { output: responseString } = executorResponseValues;
    if (!responseString) {
      throw new Error(
        `value "output" not returned from agent executor chain, got values: ${executorResponseValues}`
      );
    }
    return responseString;
  }
}

export default Toolkit;
