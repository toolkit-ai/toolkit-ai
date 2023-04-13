import { Tool } from 'langchain/agents';
import queryRegistry from 'query-registry';

const { searchPackages } = queryRegistry;

class NpmSearch extends Tool {
  override name = 'npm-search';

  override description =
    'Search NPM to find packages given a search string. The response is an array of JSON objects including package names, descriptions, and overall quality scores.';

  // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
  protected override async _call(searchString: string): Promise<string> {
    try {
      const { objects: results } = await searchPackages({
        query: {
          text: searchString,
        },
      });

      if (results.length < 1) {
        return 'Error: no results';
      }

      const info = results.map(
        ({ package: { name, description }, score: { final } }) => ({
          name,
          description,
          score: final,
        })
      );
      return JSON.stringify(info);
    } catch (err) {
      return `Error: ${err}`;
    }
  }
}

export default NpmSearch;
