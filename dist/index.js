import { z } from 'zod';
import { readFileSync } from 'fs';
import camelCase from 'camelcase';
import Handlebars from 'handlebars';
import { format } from 'prettier';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import slugify from '@sindresorhus/slugify';
import { OpenAI, LLMChain } from 'langchain';
import { Tool, ZeroShotAgent, AgentExecutor } from 'langchain/agents';
import { PromptTemplate } from 'langchain/prompts';
import { SerpAPI } from 'langchain/tools';
import queryRegistry from 'query-registry';

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

function resolveFromSrc(relativePath) {
    const currentFileURL = import.meta.url;
    const currentFilePath = fileURLToPath(currentFileURL);
    const currentDirPath = dirname(currentFilePath);
    const rootPath = resolve(currentDirPath, '../..');
    return join(rootPath, '/src', relativePath);
}

class ToolFormatter {
    tool;
    langchainTemplate;
    constructor(tool) {
        this.tool = tool;
        const langchainTemplateString = readFileSync(resolveFromSrc('templates/langchain-tool.hbs')).toString();
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

const { getPackument } = queryRegistry;
class NpmInfo extends Tool {
    name = 'npm-info';
    description = 'Query NPM to fetch the README file of a particular package by name. Use this to discover implementation and usage details for a given package.';
    // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
    async _call(packageName) {
        const results = await getPackument({
            name: packageName,
        });
        return results.readme || 'No details available';
    }
}

const { searchPackages } = queryRegistry;
class NpmSearch extends Tool {
    name = 'npm-search';
    description = 'Search NPM to find packages given a search string. The response is an array of JSON objects including package names, descriptions, and overall quality scores.';
    // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
    async _call(searchString) {
        const { objects: results } = await searchPackages({
            query: {
                text: searchString,
            },
        });
        if (results.length < 1) {
            return 'Error: no results';
        }
        const info = results.map(({ package: { name, description }, score: { final } }) => ({
            name,
            description,
            score: final,
        }));
        return JSON.stringify(info);
    }
}

class Toolkit {
    openAIApiKey;
    serpApiKey;
    tools;
    // Chain used to generate tool without use of other tools
    generatorChain;
    // Chain used to generate tool using an agent that executes other tools
    executorChain;
    constructor(input) {
        this.openAIApiKey = input?.openAIApiKey;
        this.serpApiKey = input?.serpApiKey;
        this.tools = [new NpmSearch(), new NpmInfo(), new SerpAPI(this.serpApiKey)];
        const generatorPromptText = readFileSync(resolveFromSrc('templates/generate-tool-prompt.txt')).toString();
        this.constructGeneratorChain(generatorPromptText);
        this.constructExecutorChain(generatorPromptText);
    }
    // Primary public method used to generate a tool,
    // with or without an agent executing helper tools
    async generateTool(input, withExecutor = false) {
        // Call appropriate chain
        const responseString = withExecutor
            ? await this.callExecutor(input)
            : await this.callGenerator(input);
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
    newLlmChain(prompt) {
        const llm = new OpenAI({
            modelName: 'gpt-4',
            temperature: 0,
            ...(this.openAIApiKey ? { openAIApiKey: this.openAIApiKey } : {}),
        });
        return new LLMChain({ llm, prompt });
    }
    constructGeneratorChain(generatorPromptText) {
        const generatorPromptTemplate = new PromptTemplate({
            template: generatorPromptText,
            inputVariables: ['generateInput'],
        });
        this.generatorChain = this.newLlmChain(generatorPromptTemplate);
    }
    constructExecutorChain(generatorPromptText) {
        const executorPromptText = Handlebars.compile(readFileSync(resolveFromSrc('templates/executor-prompt.hbs')).toString())({ generateToolPrompt: generatorPromptText });
        const executorPromptTemplate = new PromptTemplate({
            template: executorPromptText,
            inputVariables: [
                'generateInput',
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
    async callGenerator(input) {
        // Call LLM chain with our prompt and receive response
        const generatorResponseValues = await this.generatorChain.call({
            generateToolInput: JSON.stringify(input),
        });
        // Pick relevant field from response
        const { text: responseString } = generatorResponseValues;
        if (!responseString) {
            throw new Error(`value "text" not returned from OpenAPI LLM chain, got values: ${generatorResponseValues}`);
        }
        return responseString;
    }
    async callExecutor(input) {
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
            throw new Error(`value "output" not returned from agent executor chain, got values: ${executorResponseValues}`);
        }
        return responseString;
    }
}

export { GeneratedToolSchema, JsonObjectSchema, JsonPrimitiveSchema, JsonValueSchema, ToolFormatter, Toolkit as default };
