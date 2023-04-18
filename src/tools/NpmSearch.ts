import { Tool } from 'langchain/agents';

import { searchNpm } from 'lib/npm-registry';

class NpmSearch extends Tool {
  override name = 'npm-search';

  override description =
    'Search NPM to find packages given a search string. The response is an array of JSON objects including package names, descriptions, and overall quality scores.';

  // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
  protected override async _call(searchString: string): Promise<string> {
    try {
      const results = await searchNpm(searchString);
      if (results.length < 1) {
        return 'Error: no results';
      }

      return JSON.stringify(results);
    } catch (err) {
      return `Error: ${err}`;
    }
  }
}

export default NpmSearch;
