export function kyBaseServiceTemplate(): string {
  return `import ky, { type KyInstance, type Options } from 'ky';

export interface BaseResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export type RequestConfig = Options;

export abstract class BaseService {
  protected readonly client: KyInstance;

  constructor(baseURL?: string) {
    this.client = ky.create({
      prefixUrl: baseURL || '',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      hooks: {
        beforeRequest: [
          (request) => {
            // TODO: Add auth token logic here
            // const token = getToken();
            // if (token) request.headers.set('Authorization', \`Bearer \${token}\`);
          },
        ],
        afterResponse: [
          async (request, options, response) => {
            // TODO: Add response handling logic here
            return response;
          },
        ],
      },
    });
  }

  protected async get<T>(endpoint: string, options?: Options): Promise<BaseResponse<T>> {
    const response = await this.client.get(endpoint, options);
    const data = await response.json<T>();
    return { data, status: response.status };
  }

  protected async post<T>(endpoint: string, data?: unknown, options?: Options): Promise<BaseResponse<T>> {
    const response = await this.client.post(endpoint, {
      json: data,
      ...options,
    });
    const responseData = await response.json<T>();
    return { data: responseData, status: response.status };
  }

  protected async put<T>(endpoint: string, data?: unknown, options?: Options): Promise<BaseResponse<T>> {
    const response = await this.client.put(endpoint, {
      json: data,
      ...options,
    });
    const responseData = await response.json<T>();
    return { data: responseData, status: response.status };
  }

  protected async patch<T>(endpoint: string, data?: unknown, options?: Options): Promise<BaseResponse<T>> {
    const response = await this.client.patch(endpoint, {
      json: data,
      ...options,
    });
    const responseData = await response.json<T>();
    return { data: responseData, status: response.status };
  }

  protected async delete<T>(endpoint: string, options?: Options): Promise<BaseResponse<T>> {
    const response = await this.client.delete(endpoint, options);
    const data = await response.json<T>();
    return { data, status: response.status };
  }
}
`;
}
