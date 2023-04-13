import slugify from '@sindresorhus/slugify';
import type { GenerateToolInput } from 'BaseChain';
import ExecutorChain from 'ExecutorChain';
import IteratorChain, { IterateToolInput } from 'IteratorChain';
import SimpleChain from 'SimpleChain';

import ToolFormatter from 'ToolFormatter';
import { GeneratedToolSchema } from 'lib/schemas';
import type { GeneratedTool, BaseTool, Tool } from 'lib/types';

export type ToolkitInput = {
  openAIApiKey?: string;
  serpApiKey?: string;
  logToConsole?: boolean;
};

class Toolkit {
  // Chain used to generate tool without use of other tools
  private generatorChain: SimpleChain;

  // Chain used to generate tool using an agent that executes other tools
  private executorChain: ExecutorChain;

  private iteratorChain: IteratorChain;

  constructor(input?: ToolkitInput) {
    const openAIApiKey = input?.openAIApiKey || process.env['OPENAI_API_KEY'];
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not defined in params or environment');
    }

    const serpApiKey = input?.serpApiKey || process.env['SERP_API_KEY'];
    if (!serpApiKey) {
      throw new Error('Serp API key not defined in params or environment');
    }

    const logToConsole = input?.logToConsole || false;

    this.generatorChain = new SimpleChain({ openAIApiKey, logToConsole });
    this.executorChain = new ExecutorChain({
      openAIApiKey,
      serpApiKey,
      logToConsole,
    });
    this.iteratorChain = new IteratorChain({
      openAIApiKey,
      serpApiKey,
      logToConsole,
    });
  }

  // Primary public method used to generate a tool,
  // with or without an agent executing helper tools
  async generateTool(
    input: GenerateToolInput,
    withExecutor = false
  ): Promise<Tool> {
    // Call appropriate chain
    const responseString: string = withExecutor
      ? await this.generatorChain.generate(input)
      : await this.executorChain.generate(input);

    return this.parseResponse(responseString);
  }

  async iterateTool(input: IterateToolInput): Promise<Tool> {
    const responseString: string = await this.iteratorChain.generate(input);
    return this.parseResponse(responseString);
  }

  // eslint-disable-next-line class-methods-use-this
  private parseResponse(responseString: string) {
    // Parse response into JSON object
    let responseObject: any;
    try {
      responseObject = JSON.parse(responseString);
    } catch (err) {
      throw new Error(
        `response could not be parsed as JSON: ${responseString}`
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
