/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

import { program } from 'commander';

import Toolkit from 'Toolkit';
import { IterateInputSchema } from 'lib/schemas';

process.env['LANGCHAIN_HANDLER'] = 'langchain';

interface Options {
  json: string;
  openAIApiKey?: string | undefined;
  serpApiKey?: string | undefined;
  verbose: boolean;
}

program
  .requiredOption('--json <path>')
  .option('--openAIApiKey <key>')
  .option('--serpApiKey <key>')
  .option('-v, --verbose', undefined, false);
program.parse();
const { json, openAIApiKey, serpApiKey, verbose } = program.opts<Options>();

const inputText = readFileSync(json).toString();
const inputJson = JSON.parse(inputText);
const input = IterateInputSchema.parse(inputJson);

const toolkit = new Toolkit({
  ...(openAIApiKey ? { openAIApiKey } : {}),
  ...(serpApiKey ? { serpApiKey } : {}),
  logToConsole: verbose,
});

function runTool(langChainCode: string) {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(
      `docker`,
      [
        'run',
        '--rm',
        '-i',
        '-e',
        `OPENAI_API_KEY=${openAIApiKey}`,
        'public.ecr.aws/r8l0v3i5/tool-runner:latest',
      ],
      { stdio: ['pipe', 'pipe', 'inherit'] }
    );
    proc.stdin.write(langChainCode);
    proc.stdin.end();

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data;
    });

    proc.on('exit', () => resolve(output));
    proc.on('error', (err) => reject(err));
  });
}

function log(msg: string) {
  if (verbose) {
    console.log(msg);
  }
}

(async () => {
  let prevCode = '';
  let nextCode = '';

  log('Generating tool...');
  const tool = await toolkit.generateTool(input, true);
  log(`code:\n${tool.code}\n\n`);

  nextCode = tool.code;
  let iteration = 0;

  do {
    log(`Iteration ${iteration}`);

    log('Testing tool...');
    const logs = await runTool(tool.langChainCode);
    log(`logs:\n${logs}\n\n`);

    log('Revising...');
    const result = await toolkit.iterateTool({ tool, logs });
    log(`code:\n${result.code}\n\n`);

    prevCode = nextCode;
    nextCode = result.code;
    iteration += 1;
  } while (prevCode !== nextCode);

  log('Complete');
})();
