declare module '@reach/router/es/lib/utils' {
  export type MatchParams = {
    [key: string]: string | undefined;
  };
  export type MatchResult = {
    params: MatchParams;
  };
  export function match(pattern: string, path: string): MatchResult | null;
}
