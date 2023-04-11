import { Tool } from 'langchain/agents';
declare class NpmInfo extends Tool {
    name: string;
    description: string;
    protected _call(packageName: string): Promise<string>;
}
export default NpmInfo;
//# sourceMappingURL=NpmInfo.d.ts.map