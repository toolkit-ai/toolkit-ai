#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { program } from 'commander';
import { config } from 'dotenv';
import { spawn } from 'child_process';
import slugify from '@sindresorhus/slugify';
import camelCase from 'camelcase';
import Handlebars from 'handlebars';
import { format } from 'prettier';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { findUpSync } from 'find-up';
import { Tool, ZeroShotAgent, AgentExecutor } from 'langchain/agents';
import { PromptTemplate } from 'langchain/prompts';
import { SerpAPI } from 'langchain/tools';
import { ConsoleCallbackHandler } from 'langchain/callbacks';
import { LLMChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';
import { getPackument, searchPackages } from 'query-registry';
import { z } from 'zod';

let templatesPath = null;
function getTemplatesPath() {
    if (!templatesPath) {
        const filePath = fileURLToPath(import.meta.url);
        const cwd = dirname(filePath);
        const packagePath = findUpSync('package.json', {
            cwd,
        });
        if (!packagePath) {
            throw new Error('path to package.json could not be found');
        }
        const packageDir = dirname(packagePath);
        templatesPath = `${packageDir}/templates`;
    }
    return templatesPath;
}
function readTemplate(name) {
    const path = `${getTemplatesPath()}/${name}`;
    return readFileSync(path).toString();
}

class ToolFormatter {
    tool;
    langchainTemplate;
    constructor(tool) {
        this.tool = tool;
        const langchainTemplateString = readTemplate('langchain-tool.hbs');
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

class BaseToolGenerationChain {
    openAIApiKey;
    logToConsole;
    chain;
    constructor(input) {
        this.openAIApiKey = input.openAIApiKey;
        this.logToConsole = input.logToConsole;
    }
    async generate(input) {
        const outputKey = this.getOutputKey();
        const chainValues = this.getChainValues(input);
        const consoleCallbackHandler = new ConsoleCallbackHandler({
            alwaysVerbose: true,
        });
        if (this.logToConsole) {
            this.chain.callbackManager.addHandler(consoleCallbackHandler);
        }
        const responseValues = await this.chain.call(chainValues);
        const responseString = responseValues[outputKey];
        if (!responseString) {
            throw new Error(`value "${outputKey}" not returned from chain call, got values: ${responseValues}`);
        }
        if (this.logToConsole) {
            this.chain.callbackManager.removeHandler(consoleCallbackHandler);
        }
        return responseString;
    }
    newLlmChain() {
        const llm = new OpenAI({
            modelName: 'gpt-4',
            temperature: 0,
            openAIApiKey: this.openAIApiKey,
        });
        const prompt = this.getPromptTemplate();
        return new LLMChain({ llm, prompt });
    }
}

class NpmInfo extends Tool {
    name = 'npm-info';
    description = 'Query NPM to fetch the README file of a particular package by name. Use this to discover implementation and usage details for a given package.';
    // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
    async _call(packageName) {
        try {
            const results = await getPackument({
                name: packageName,
            });
            return results.readme || 'No details available';
        }
        catch (err) {
            return `Error: ${err}`;
        }
    }
}

class NpmSearch extends Tool {
    name = 'npm-search';
    description = 'Search NPM to find packages given a search string. The response is an array of JSON objects including package names, descriptions, and overall quality scores.';
    // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
    async _call(searchString) {
        try {
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
        catch (err) {
            return `Error: ${err}`;
        }
    }
}

/* eslint-disable class-methods-use-this */
class ExecutorToolGenerationChain extends BaseToolGenerationChain {
    serpApiKey;
    tools;
    constructor(input) {
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
    getPromptTemplate() {
        const toolSpec = readTemplate('tool-spec.txt');
        const generateToolPrompt = Handlebars.compile(readTemplate('generate-tool-prompt.hbs'))({ toolSpec });
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
    getChainValues(input) {
        return {
            generateToolInput: JSON.stringify(input),
            tools: this.tools
                .map(({ name, description }) => `${name}: ${description}`)
                .join('\n'),
            toolNames: this.tools.map(({ name }) => name).join(', '),
        };
    }
    getOutputKey() {
        return 'output';
    }
}

/* eslint-disable class-methods-use-this */
class IterativeToolGenerationChain extends BaseToolGenerationChain {
    serpApiKey;
    tools;
    constructor(input) {
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
    getPromptTemplate() {
        const toolSpec = readTemplate('tool-spec.txt');
        const iterateToolPrompt = Handlebars.compile(readTemplate('iterate-tool-prompt.hbs'))({
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
    getChainValues({ tool, logs }) {
        return {
            tool: JSON.stringify(tool),
            runLogs: logs,
            tools: this.tools
                .map(({ name, description }) => `${name}: ${description}`)
                .join('\n'),
            toolNames: this.tools.map(({ name }) => name).join(', '),
        };
    }
    getOutputKey() {
        return 'output';
    }
}

/* eslint-disable class-methods-use-this */
class SimpleToolGenerationChain extends BaseToolGenerationChain {
    constructor(input) {
        super(input);
        this.chain = this.newLlmChain();
    }
    getPromptTemplate() {
        const toolSpec = readTemplate('tool-spec.txt');
        const template = Handlebars.compile(readTemplate('generate-tool-prompt.hbs'))({ toolSpec });
        return new PromptTemplate({
            template,
            inputVariables: ['generateToolInput'],
        });
    }
    getChainValues(input) {
        return { generateToolInput: JSON.stringify(input) };
    }
    getOutputKey() {
        return 'text';
    }
}

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
const IterateInputSchema = z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.optional(JsonObjectSchema),
    outputSchema: z.optional(JsonObjectSchema),
});

class Toolkit {
    // Chain used to generate tool without use of other tools
    simpleToolGenerationChain;
    // Chain used to generate tool using an agent that executes other tools
    executorToolGenerationChain;
    // Chain used to generate tool using iterative executor
    iterativeToolGenerationChain;
    constructor(input) {
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
    async generateTool(input, withExecutor = false) {
        // Call appropriate chain
        const responseString = withExecutor
            ? await this.simpleToolGenerationChain.generate(input)
            : await this.executorToolGenerationChain.generate(input);
        return this.parseResponse(responseString);
    }
    async iterateTool(input) {
        const responseString = await this.iterativeToolGenerationChain.generate(input);
        return this.parseResponse(responseString);
    }
    // eslint-disable-next-line class-methods-use-this
    parseResponse(responseString) {
        // Parse response into JSON object
        let responseObject;
        try {
            responseObject = JSON.parse(responseString);
        }
        catch (err) {
            throw new Error(`response could not be parsed as JSON: ${responseString}`);
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

/* eslint-disable no-await-in-loop */
class ToolIterator {
    toolkit;
    openAIApikey;
    verbose;
    maxIterations;
    constructor({ openAIApiKey, serpApiKey, verbose = false, maxIterations = 5, }) {
        this.openAIApikey = openAIApiKey;
        this.verbose = verbose;
        this.maxIterations = maxIterations;
        this.toolkit = new Toolkit({
            openAIApiKey,
            serpApiKey,
            logToConsole: verbose,
        });
    }
    async iterate(input) {
        let prevTool = null;
        let currentTool = null;
        currentTool = await this.generateInitialTool(input);
        let iteration = 0;
        do {
            this.log(`\nITERATION ${iteration}\n`);
            const logs = await this.runTool(currentTool);
            prevTool = currentTool;
            currentTool = await this.reviseTool(prevTool, logs);
            iteration += 1;
        } while (currentTool.code !== prevTool.code &&
            iteration < this.maxIterations);
        const msg = iteration === this.maxIterations
            ? `\nMAX ${this.maxIterations} ITERATIONS REACHED`
            : '\nCOMPLETE';
        this.log(msg);
        return currentTool;
    }
    log(msg) {
        if (this.verbose) {
            // eslint-disable-next-line no-console
            console.log(msg);
        }
    }
    async generateInitialTool(input) {
        this.log('GENERATING INITIAL TOOL\n');
        const tool = await this.toolkit.generateTool(input, true);
        this.log(`\ngenerated code:\n${tool.code}`);
        return tool;
    }
    async runTool(tool) {
        this.log('TESTING TOOL\n');
        const logs = await new Promise((resolve, reject) => {
            const proc = spawn(`docker`, [
                'run',
                '--platform',
                'linux/amd64',
                '--rm',
                '-i',
                '-e',
                `OPENAI_API_KEY=${this.openAIApikey}`,
                'public.ecr.aws/r8l0v3i5/tool-runner:latest',
            ], { stdio: ['pipe', 'pipe', 'inherit'] });
            proc.stdin.write(tool.langChainCode);
            proc.stdin.end();
            let output = '';
            proc.stdout.on('data', (data) => {
                output += data;
            });
            proc.on('exit', () => resolve(output));
            proc.on('error', (err) => reject(err));
        });
        this.log(`logs:\n${logs}`);
        return logs;
    }
    async reviseTool(inputTool, logs) {
        this.log('REVISING TOOL\n');
        const outputTool = await this.toolkit.iterateTool({
            tool: inputTool,
            logs,
        });
        this.log(`\ngenerated code:\n${outputTool.code}`);
        return outputTool;
    }
}

config();
program
    .requiredOption('--inputJson <path>', 'path to json file with partial tool specification')
    .requiredOption('--outputJs <path>', 'path to javascript output file')
    .option('--openAIApiKey <key>')
    .option('--serpApiKey <key>')
    .option('-v, --verbose', undefined, false);
program.parse();
const options = program.opts();
const openAIApiKey = options.openAIApiKey || process.env['OPENAI_API_KEY'];
if (!openAIApiKey) {
    throw new Error('OpenAI API key must be provided in --openAIApiKey argument or OPENAI_API_KEY environment variable');
}
const serpApiKey = options.serpApiKey || process.env['SERP_API_KEY'];
if (!serpApiKey) {
    throw new Error('Serp API key must be provided in --serpApiKey argument or SERP_API_KEY environment variable');
}
const inputText = readFileSync(options.inputJson).toString();
const inputJson = JSON.parse(inputText);
const input = IterateInputSchema.parse(inputJson);
const iterator = new ToolIterator({
    openAIApiKey,
    serpApiKey,
    verbose: options.verbose,
});
(async () => {
    const tool = await iterator.iterate(input);
    writeFileSync(options.outputJs, tool.langChainCode);
    // eslint-disable-next-line no-console
    console.log(`LangChain tool written to ${options.outputJs}`);
})();
