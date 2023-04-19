import { readFileSync, writeFileSync } from 'fs';

import { program } from 'commander';
// eslint-disable-next-line import/no-extraneous-dependencies
import { config } from 'dotenv';

import ToolIterator from 'ToolIterator';
import { IterateInputSchema } from 'lib/schemas';

config();

interface Options {
  inputJson: string;
  outputJs: string;
  openAIApiKey?: string | undefined;
  serpApiKey?: string | undefined;
  modelName: string;
  verbose: boolean;
}

program
  .requiredOption(
    '--inputJson <path>',
    'path to json file with partial tool specification'
  )
  .requiredOption('--outputJs <path>', 'path to javascript output file')
  .option('--openAIApiKey <key>')
  .option('--serpApiKey <key>')
  .option('--modelName <name>', 'name of the OpenAI model to use', 'gpt-4')
  .option('-v, --verbose', undefined, false);
program.parse();
const options = program.opts<Options>();

const openAIApiKey = options.openAIApiKey || process.env['OPENAI_API_KEY'];
if (!openAIApiKey) {
  throw new Error(
    'OpenAI API key must be provided in --openAIApiKey argument or OPENAI_API_KEY environment variable'
  );
}

const serpApiKey = options.serpApiKey || process.env['SERP_API_KEY'];
if (!serpApiKey) {
  throw new Error(
    'Serp API key must be provided in --serpApiKey argument or SERP_API_KEY environment variable'
  );
}

const inputText = readFileSync(options.inputJson).toString();
const inputJson = JSON.parse(inputText);
const input = IterateInputSchema.parse(inputJson);
const iterator = new ToolIterator({
  openAIApiKey,
  serpApiKey,
  modelName: options.modelName,
  verbose: options.verbose,
});

(async () => {
  const tool = await iterator.iterate(input);
  writeFileSync(options.outputJs, tool.langChainCode);
  // eslint-disable-next-line no-console
  console.log(`LangChain tool written to ${options.outputJs}`);
})();
