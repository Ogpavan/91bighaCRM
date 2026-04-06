declare module "pg" {
  export type QueryResultRow = Record<string, unknown>;

  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = QueryResultRow>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
  }
}
