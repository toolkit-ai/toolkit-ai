import { Tool } from 'langchain/agents';

import { getPackageReadme } from 'lib/npm-registry';

class NpmInfo extends Tool {
  override name = 'npm-info';

  override description =
    'Query NPM to fetch the README file of a particular package by name. Use this to discover implementation and usage details for a given package.';

  // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
  protected override async _call(packageName: string): Promise<string> {
    try {
      const readme = await getPackageReadme(packageName);
      return readme || 'No details available';
    } catch (err) {
      return `Error: ${err}`;
    }
  }
}

export default NpmInfo;
