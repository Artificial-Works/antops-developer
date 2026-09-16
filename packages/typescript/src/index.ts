export const DEFAULT_BASE_URL = "https://api.antops.dev";
const MAX_RESPONSE_BYTES = 2_000_000;

export class AntOpsError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AntOpsError";
  }
}

export class AuthenticationError extends AntOpsError {}
export class RateLimitError extends AntOpsError {}

export type AntOpsClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  clientId?: string;
  fetch?: typeof globalThis.fetch;
  requestHeaders?: Record<string, string>;
};

export type ChangeRiskFile = { path: string; content: string };
export type Page<T> = { items: T[]; page: number; page_size: number; total: number };
export type TenderSearchOptions = { keywords?: string[]; page?: number; pageSize?: number; jurisdiction?: string };

export class AntOpsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly clientId: string;
  private readonly requestFetch: typeof globalThis.fetch;
  private readonly requestHeaders: Record<string, string>;

  readonly company = {
    lookup: (jurisdiction: string, registrationNumber: string, provider?: string) =>
      this.get(`/v1/companies/${jurisdiction}/${registrationNumber}`, provider ? { provider } : {}),
    watch: (jurisdiction: string, registrationNumber: string, intervalSeconds = 86_400) =>
      this.post("/v1/companies", { jurisdiction, registration_number: registrationNumber, monitor_interval_seconds: intervalSeconds })
  };

  readonly domains = {
    check: (domain: string) => this.post("/v1/domain/check", { domain }),
    monitor: (domain: string, options: { customerLabel?: string; intervalSeconds?: number } = {}) =>
      this.post("/v1/domain-assets", { domain, customer_label: options.customerLabel, policy: { interval_seconds: options.intervalSeconds ?? 3600 } }),
    status: (assetId: string) => this.get(`/v1/domain-assets/${assetId}/status`)
  };

  readonly tenders = {
    search: (options: TenderSearchOptions = {}) => {
      const params = new URLSearchParams({ page: String(options.page ?? 1), page_size: String(options.pageSize ?? 25) });
      options.keywords?.forEach((value) => params.append("keywords", value));
      if (options.jurisdiction) params.set("jurisdiction", options.jurisdiction);
      return this.get(`/v1/tenders?${params.toString()}`) as Promise<Page<Record<string, unknown>>>;
    },
    iterSearch: (options: Omit<TenderSearchOptions, "page"> = {}) => this.iterTenderSearch(options),
    matches: (savedSearchId: string) => this.get(`/v1/tender-saved-searches/${savedSearchId}/matches`)
  };

  readonly changeRisk = {
    analyze: (files: ChangeRiskFile[], revision?: string) => this.post("/v1/change-risk/analyses", { files, ...(revision ? { revision } : {}) })
  };

  readonly documents = {
    upload: async (file: Blob, name: string) => {
      const form = new FormData();
      form.set("document", file, name);
      return this.request("POST", "/v1/documents", { body: form });
    }
  };

  constructor(options: AntOpsClientOptions) {
    if (!options.apiKey.trim()) throw new Error("An AntOps API key is required.");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.clientId = options.clientId ?? "typescript/0.2.1";
    this.requestFetch = options.fetch ?? globalThis.fetch;
    this.requestHeaders = options.requestHeaders ?? {};
  }

  withRequestHeaders(headers: Record<string, string>): AntOpsClient {
    return new AntOpsClient({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      timeoutMs: this.timeoutMs,
      clientId: this.clientId,
      fetch: this.requestFetch,
      requestHeaders: { ...this.requestHeaders, ...headers }
    });
  }

  async get(path: string, params: Record<string, string> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    const separator = path.includes("?") || !query ? "" : "?";
    return this.request("GET", `${path}${separator}${query}`);
  }

  async post(path: string, payload: unknown): Promise<any> {
    return this.request("POST", path, { body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
  }

  async *iterTenderSearch(options: Omit<TenderSearchOptions, "page"> = {}) {
    let page = 1;
    while (true) {
      const result = await this.tenders.search({ ...options, page });
      yield* result.items;
      if (result.items.length === 0 || page * result.page_size >= result.total) return;
      page += 1;
    }
  }

  private async request(method: string, path: string, init: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.requestFetch(`${this.baseUrl}${path}`, {
        ...init,
        method,
        signal: controller.signal,
        headers: {
          "X-API-Key": this.apiKey,
          "X-AntOps-Client": this.clientId,
          "User-Agent": `antops-${this.clientId}`,
          ...this.requestHeaders,
          ...init.headers
        }
      });
      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (contentLength > MAX_RESPONSE_BYTES) throw new AntOpsError("AntOps response exceeded the client safety limit.", response.status);
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BYTES) throw new AntOpsError("AntOps response exceeded the client safety limit.", response.status);
      let body: any;
      try { body = JSON.parse(text); } catch { throw new AntOpsError("AntOps returned a non-JSON response.", response.status); }
      if (!response.ok) {
        const message = typeof body?.detail === "string" ? body.detail.slice(0, 500) : `AntOps request failed with status ${response.status}.`;
        const Type = response.status === 401 || response.status === 403 ? AuthenticationError : response.status === 429 ? RateLimitError : AntOpsError;
        throw new Type(message, response.status);
      }
      return body;
    } catch (error) {
      if (error instanceof AntOpsError) throw error;
      throw new AntOpsError(error instanceof Error && error.name === "AbortError" ? "AntOps request timed out." : "AntOps request could not be completed.");
    } finally {
      clearTimeout(timer);
    }
  }
}
