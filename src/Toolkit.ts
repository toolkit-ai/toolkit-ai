import slugify from '@sindresorhus/slugify';

import ToolFormatter from 'ToolFormatter';
import type { GenerateToolInput } from 'chains/BaseToolGenerationChain';
import ExecutorToolGenerationChain from 'chains/ExecutorToolGenerationChain';
import IterativeToolGenerationChain, {
  IterateToolInput,
} from 'chains/IterativeToolGenerationChain';
import SimpleToolGenerationChain from 'chains/SimpleToolGenerationChain';
import { GeneratedToolSchema } from 'lib/schemas';
import type { GeneratedTool, BaseTool, Tool } from 'lib/types';

export type ToolkitInput = {
  openAIApiKey?: string;
  serpApiKey?: string;
  logToConsole?: boolean;
};

class Toolkit {
  // Chain used to generate tool without use of other tools
  private simpleToolGenerationChain: SimpleToolGenerationChain;

  // Chain used to generate tool using an agent that executes other tools
  private executorToolGenerationChain: ExecutorToolGenerationChain;

  // Chain used to generate tool using iterative executor
  private iterativeToolGenerationChain: IterativeToolGenerationChain;

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

    this.simpleToolGenerationChain = new SimpleToolGenerationChain({
      openAIApiKey,
      logToConsole,
    });
    this.executorToolGenerationChain = new ExecutorToolGenerationChain({
      openAIApiKey,
      serpApiKey,
      logToConsole,
    });
    this.iterativeToolGenerationChain = new IterativeToolGenerationChain({
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
      ? await this.executorToolGenerationChain.generate(input)
      : await this.simpleToolGenerationChain.generate(input);

    return this.parseResponse(responseString);
  }

  async iterateTool(input: IterateToolInput): Promise<Tool> {
    const responseString: string =
      await this.iterativeToolGenerationChain.generate(input);
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
