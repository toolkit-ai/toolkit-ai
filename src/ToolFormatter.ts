import { readFileSync } from 'fs';

import camelCase from 'camelcase';
import Handlebars from 'handlebars';
import { format } from 'prettier';

import type { BaseTool, JsonValue } from 'lib/types';
import { resolve } from 'lib/util';

class ToolFormatter {
  private tool: BaseTool;

  private langchainTemplate: HandlebarsTemplateDelegate;

  constructor(tool: BaseTool) {
    this.tool = tool;

    const langchainTemplateString = readFileSync(
      resolve('../src/templates/langchain-tool.hbs')
    ).toString();
    this.langchainTemplate = Handlebars.compile(langchainTemplateString);
  }

  private static stringifyJsonSchema(jsonSchema: JsonValue) {
    return JSON.stringify(jsonSchema || null, null, 2).replaceAll('\n', '\n  ');
  }

  private static toLangChainDescription(
    description: string,
    inputSchemaString: string
  ) {
    let result = description;
    if (description.slice(-1) !== '.') {
      result += '.';
    }
    result += ' The action input should adhere to this JSON schema:\n';
    result += inputSchemaString.replaceAll('{', '{{').replaceAll('}', '}}');
    return result;
  }

  toLangChain() {
    return this.langchainTemplate({
      className: camelCase(this.tool.slug, { pascalCase: true }),
      toolCode: format(this.tool.code, { parser: 'babel' }),
      toolSlug: this.tool.slug,
      langchainDescription: ToolFormatter.toLangChainDescription(
        this.tool.description,
        JSON.stringify(this.tool.inputSchema || null)
      ),
      inputSchema: ToolFormatter.stringifyJsonSchema(this.tool.inputSchema),
      outputSchema: ToolFormatter.stringifyJsonSchema(this.tool.outputSchema),
    });
  }

  toolWithFormats() {
    return {
      ...this.tool,
      langChainCode: this.toLangChain(),
    };
  }
}

export default ToolFormatter;
