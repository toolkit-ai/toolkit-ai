import { Tool } from 'langchain/agents';
declare class NpmSearch extends Tool {
    name: string;
    description: string;
    protected _call(searchString: string): Promise<string>;
}
export default NpmSearch;
//# sourceMappingURL=NpmSearch.d.ts.map