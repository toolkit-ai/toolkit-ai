import { readFileSync } from 'fs';

import slugify from '@sindresorhus/slugify';
import ToolFormatter from 'ToolFormatter';
import { LLMChain, OpenAI } from 'langchain';
import { PromptTemplate } from 'langchain/prompts';
import type { ChainValues } from 'langchain/schema';

import { GeneratedToolSchema } from 'lib/schemas';
import type { GeneratedTool, JsonObject, BaseTool, Tool } from 'lib/types';
import { resolve } from 'lib/util';

export type ToolkitInput = {
  openAIApiKey?: string;
};

export type GenerateToolInput = {
  name: string;
  description: string;
  inputSchema?: JsonObject | undefined;
  outputSchema?: JsonObject | undefined;
};

class Toolkit {
  private static generatePrompt = readFileSync(
    resolve('../src/templates/generate-prompt.txt')
  ).toString();

  private generatorChain: LLMChain;

  constructor(input?: ToolkitInput) {
    const openAIApiKey = input?.openAIApiKey;
    this.generatorChain = Toolkit.newGeneratorChain(openAIApiKey);
  }

  private static newGeneratorChain(openAIApiKey?: string) {
    const llm = new OpenAI({
      modelName: 'gpt-4',
      temperature: 0,
      ...(openAIApiKey ? { openAIApiKey } : {}),
    });

    const promptTemplate = new PromptTemplate({
      template: Toolkit.generatePrompt,
      inputVariables: ['generateInput'],
    });

    return new LLMChain({ llm, prompt: promptTemplate });
  }

  async generateTool(input: GenerateToolInput): Promise<Tool> {
    // Call LLM chain with our prompt and receive response
    const llmChainResponseValues: ChainValues = await this.generatorChain.call({
      generateInput: JSON.stringify(input),
    });

    // Pick relevant field from response
    const { text: responseString } = llmChainResponseValues;
    if (!responseString) {
      throw new Error(
        `value "text" not returned from OpenAPI LLM chain, got values: ${llmChainResponseValues}`
      );
    }

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
}

export default Toolkit;
