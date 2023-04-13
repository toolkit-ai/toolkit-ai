export type ToolIteratorInput = {
    openAIApiKey: string;
    serpApiKey: string;
};
declare class ToolIterator {
    private toolkit;
    private tool;
    constructor(input: ToolIteratorInput);
    private generateTool;
    private runTool;
}
export default ToolIterator;
//# sourceMappingURL=ToolIterator.d.ts.map