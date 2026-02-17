export function fetchBaseServiceTemplate(): string {
  return `export interface BaseResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

export abstract class BaseService {
  protected readonly baseURL: string;
  protected readonly defaultHeaders: Record<string, string>;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private buildURL(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseURL || window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { params?: Record<string, string> } = {}
  ): Promise<BaseResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.buildURL(endpoint, params);

    const headers = {
      ...this.defaultHeaders,
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      // TODO: Add error handling logic here
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return { data, status: response.status };
  }

  protected getAuthHeader(): Record<string, string> {
    // TODO: Add auth token logic here
    // const token = getToken();
    // return token ? { Authorization: \`Bearer \${token}\` } : {};
    return {};
  }

  protected async get<T>(endpoint: string, config?: RequestConfig): Promise<BaseResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...config,
    });
  }

  protected async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<BaseResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  protected async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<BaseResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  protected async patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<BaseResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  protected async delete<T>(endpoint: string, config?: RequestConfig): Promise<BaseResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...config,
    });
  }
}
`;
}
