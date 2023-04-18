import axios from 'axios';

const NPM_URL = 'https://registry.npmjs.org';

type SearchResponse = {
  objects: {
    package: {
      name: string;
      description: string;
    };
    score: {
      final: number;
    };
  }[];
};

type InfoResponse = {
  readme: string;
};

export async function searchNpm(query: string) {
  const url = `${NPM_URL}/-/v1/search?text=${query}`;
  const { data } = await axios.get<SearchResponse>(url);
  return data.objects.map((object) => ({
    name: object.package.name,
    description: object.package.description,
    score: object.score.final,
  }));
}

export async function getPackageReadme(name: string) {
  const url = `${NPM_URL}/${name}`;
  const { data } = await axios.get<InfoResponse>(url);
  return data.readme;
}
