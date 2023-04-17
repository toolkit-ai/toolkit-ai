import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { findUpSync } from 'find-up';

let templatesPath: string | null = null;

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

export function readTemplate(name: string) {
  const path = `${getTemplatesPath()}/${name}`;
  return readFileSync(path).toString();
}
