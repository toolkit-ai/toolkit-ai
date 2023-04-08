import { z } from 'zod';
import { readFileSync } from 'fs';
import camelCase from 'camelcase';
import Handlebars from 'handlebars';
import { format } from 'prettier';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import slugify from '@sindresorhus/slugify';
import { OpenAI, LLMChain } from 'langchain';
import { PromptTemplate } from 'langchain/prompts';

const JsonPrimitiveSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
]);
const JsonValueSchema = z.lazy(() => z.union([
    JsonPrimitiveSchema,
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
]));
const JsonObjectSchema = z.record(JsonValueSchema);
const GeneratedToolSchema = z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: JsonObjectSchema,
    outputSchema: JsonObjectSchema,
    code: z.string(),
});

function resolve(relativePath) {
    const currentFileURL = import.meta.url;
    const currentFilePath = fileURLToPath(currentFileURL);
    const currentDirPath = dirname(currentFilePath);
    return join(currentDirPath, relativePath);
}

class ToolFormatter {
    tool;
    langchainTemplate;
    constructor(tool) {
        this.tool = tool;
        const langchainTemplateString = readFileSync(resolve('../src/templates/langchain-tool.hbs')).toString();
        this.langchainTemplate = Handlebars.compile(langchainTemplateString);
    }
    static stringifyJsonSchema(jsonSchema) {
        return JSON.stringify(jsonSchema || null, null, 2).replaceAll('\n', '\n  ');
    }
    static toLangChainDescription(description, inputSchemaString) {
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
            langchainDescription: ToolFormatter.toLangChainDescription(this.tool.description, JSON.stringify(this.tool.inputSchema || null)),
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

class Toolkit {
    static generatePrompt = readFileSync(resolve('../src/templates/generate-prompt.txt')).toString();
    generatorChain;
    constructor(input) {
        const openAIApiKey = input?.openAIApiKey;
        this.generatorChain = Toolkit.newGeneratorChain(openAIApiKey);
    }
    static newGeneratorChain(openAIApiKey) {
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
    async generateTool(input) {
        // Call LLM chain with our prompt and receive response
        const llmChainResponseValues = await this.generatorChain.call({
            generateInput: JSON.stringify(input),
        });
        // Pick relevant field from response
        const { text: responseString } = llmChainResponseValues;
        if (!responseString) {
            throw new Error(`value "text" not returned from OpenAPI LLM chain, got values: ${llmChainResponseValues}`);
        }
        // Parse response into JSON object
        let responseObject;
        try {
            responseObject = JSON.parse(responseString);
        }
        catch (err) {
            throw new Error(`value "text" could not be parsed as JSON: ${responseString}`);
        }
        // Ensure the resulting object fits expected schema
        const generatedTool = GeneratedToolSchema.parse(responseObject);
        // Add slug as an identifier
        const baseTool = {
            slug: slugify(generatedTool.name),
            ...generatedTool,
        };
        // Add formats to tool
        const tool = new ToolFormatter(baseTool).toolWithFormats();
        return tool;
    }
}

export { GeneratedToolSchema, JsonObjectSchema, JsonPrimitiveSchema, JsonValueSchema, ToolFormatter, Toolkit as default };
