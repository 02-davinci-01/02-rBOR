export function baseServiceTemplate(): string {
  return `import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface BaseResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ErrorContext {
  functionName: string;
  method: string;
  filePath: string;
}

// Configure your base URL here
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export abstract class BaseService {
  protected readonly axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: BASE_URL,
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

  protected getErrorContext(functionName: string, method: string): ErrorContext {
    return {
      functionName,
      method,
      filePath: this.constructor.name,
    };
  }

  async get<T>(endpoint: string, functionName: string, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.get<T>(endpoint, config);
    return { data: response.data, status: response.status };
  }

  async post<T>(endpoint: string, functionName: string, data?: unknown, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.post<T>(endpoint, data, config);
    return { data: response.data, status: response.status };
  }

  async put<T>(endpoint: string, functionName: string, data?: unknown, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.put<T>(endpoint, data, config);
    return { data: response.data, status: response.status };
  }

  async patch<T>(endpoint: string, functionName: string, data?: unknown, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.patch<T>(endpoint, data, config);
    return { data: response.data, status: response.status };
  }

  async delete<T>(endpoint: string, functionName: string, config?: AxiosRequestConfig): Promise<BaseResponse<T>> {
    const response = await this.axios.delete<T>(endpoint, config);
    return { data: response.data, status: response.status };
  }
}
`;
}
