import { readFileSync } from 'fs';
import { dirname } from 'path';

import { findUpSync } from 'find-up';

let templatesPath: string | null = null;

function getTemplatesPath() {
  if (!templatesPath) {
    const packagePath = findUpSync('package.json');
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
