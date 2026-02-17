export function axiosBaseServiceTemplate(): string {
  return `import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface BaseResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export type RequestConfig = AxiosRequestConfig;

export abstract class BaseService {
  protected readonly axios: AxiosInstance;

  constructor(baseURL?: string) {
    this.axios = axios.create({
      baseURL: baseURL || '',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use(
      (config) => {
        // TODO: Add auth token logic here
        // const token = getToken();
        // if (token) config.headers.Authorization = \`Bearer \${token}\`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // TODO: Add error handling logic here
        return Promise.reject(error);
      }
    );
  }

  protected async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.get<T>(endpoint, config);
    return { data: response.data, status: response.status };
  }

  protected async post<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.post<T>(endpoint, data, config);
    return { data: response.data, status: response.status };
  }

  protected async put<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.put<T>(endpoint, data, config);
    return { data: response.data, status: response.status };
  }

  protected async patch<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.patch<T>(endpoint, data, config);
    return { data: response.data, status: response.status };
  }

  protected async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.delete<T>(endpoint, config);
    return { data: response.data, status: response.status };
  }
}
`;
}
