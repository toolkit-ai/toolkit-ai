import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export function resolve(relativePath: string) {
  const currentFileURL = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileURL);
  const currentDirPath = dirname(currentFilePath);
  return join(currentDirPath, relativePath);
}
