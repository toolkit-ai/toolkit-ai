export declare function searchNpm(query: string): Promise<{
    name: string;
    description: string;
    score: number;
}[]>;
export declare function getPackageReadme(name: string): Promise<string>;
//# sourceMappingURL=npm-registry.d.ts.map