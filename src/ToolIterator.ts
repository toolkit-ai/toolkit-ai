/* eslint-disable no-await-in-loop */
import { spawn } from 'child_process';

import Toolkit from 'Toolkit';
import type { GenerateToolInput } from 'chains/BaseChain';
import type { Tool } from 'lib/types';

type ToolIteratorInput = {
  openAIApiKey: string;
  serpApiKey: string;
  verbose?: boolean;
  maxIterations?: number;
};

class ToolIterator {
  private toolkit: Toolkit;

  private openAIApikey: string;

  private verbose: boolean;

  private maxIterations: number;

  constructor({
    openAIApiKey,
    serpApiKey,
    verbose = false,
    maxIterations = 5,
  }: ToolIteratorInput) {
    this.openAIApikey = openAIApiKey;
    this.verbose = verbose;
    this.maxIterations = maxIterations;
    this.toolkit = new Toolkit({
      openAIApiKey,
      serpApiKey,
      logToConsole: verbose,
    });
  }

  async iterate(input: GenerateToolInput) {
    let prevTool: Tool | null = null;
    let currentTool: Tool | null = null;

    currentTool = await this.generateInitialTool(input);

    let iteration = 0;
    do {
      this.log(`\nITERATION ${iteration}\n`);
      const logs = await this.runTool(currentTool);
      prevTool = currentTool;
      currentTool = await this.reviseTool(prevTool, logs);
      iteration += 1;
    } while (
      currentTool.code !== prevTool.code &&
      iteration < this.maxIterations
    );

    const msg =
      iteration === this.maxIterations
        ? `\nMAX ${this.maxIterations} ITERATIONS REACHED`
        : '\nCOMPLETE';
    this.log(msg);
    return currentTool;
  }

  private log(msg: string) {
    if (this.verbose) {
      // eslint-disable-next-line no-console
      console.log(msg);
    }
  }

  private async generateInitialTool(input: GenerateToolInput) {
    this.log('GENERATING INITIAL TOOL\n');
    const tool = await this.toolkit.generateTool(input, true);
    this.log(`\ngenerated code:\n${tool.code}`);
    return tool;
  }

  private async runTool(tool: Tool) {
    this.log('TESTING TOOL\n');
    const logs = await new Promise<string>((resolve, reject) => {
      const proc = spawn(
        `docker`,
        [
          'run',
          '--platform',
          'linux/amd64',
          '--rm',
          '-i',
          '-e',
          `OPENAI_API_KEY=${this.openAIApikey}`,
          'public.ecr.aws/r8l0v3i5/tool-runner:latest',
        ],
        { stdio: ['pipe', 'pipe', 'inherit'] }
      );
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

  private async reviseTool(inputTool: Tool, logs: string) {
    this.log('REVISING TOOL\n');
    const outputTool = await this.toolkit.iterateTool({
      tool: inputTool,
      logs,
    });
    this.log(`\ngenerated code:\n${outputTool.code}`);
    return outputTool;
  }
}

export default ToolIterator;
