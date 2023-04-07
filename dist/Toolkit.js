import { readFileSync } from 'fs';
import slugify from '@sindresorhus/slugify';
import ToolFormatter from 'ToolFormatter';
import { LLMChain, OpenAI } from 'langchain';
import { PromptTemplate } from 'langchain/prompts';
import { GeneratedToolSchema } from 'lib/schemas';
class Toolkit {
    static generatePrompt = readFileSync('./src/templates/generate-prompt.txt').toString();
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
export default Toolkit;
