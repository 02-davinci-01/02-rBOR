import { toPascalCase } from '../../utils/naming';
import type { HttpClient } from '../../cli';

function getConfigImport(httpClient: HttpClient): string {
  switch (httpClient) {
    case 'axios':
      return `import type { AxiosRequestConfig } from 'axios';`;
    case 'ky':
      return `import type { Options as KyOptions } from 'ky';`;
    case 'fetch':
      return ``;
  }
}

function getConfigTypeName(httpClient: HttpClient): string {
  switch (httpClient) {
    case 'axios':
      return 'AxiosRequestConfig';
    case 'ky':
      return 'KyOptions';
    case 'fetch':
      return 'RequestConfig';
  }
}

export function domainServiceTemplate(name: string, httpClient: HttpClient = 'axios'): string {
  const pascalName = toPascalCase(name);
  const configImport = getConfigImport(httpClient);
  const configType = getConfigTypeName(httpClient);

  const baseServiceImport =
    httpClient === 'fetch'
      ? `import { BaseService, type BaseResponse, type RequestConfig } from '../../../infrastructure/BaseService';`
      : `import { BaseService, type BaseResponse } from '../../../infrastructure/BaseService';`;

  return `// ${pascalName} Service

${configImport}
${baseServiceImport}
import { generateUrl, type UrlParams, type QueryParams } from '../../../infrastructure/generateURL';

export class ${pascalName}Service extends BaseService {
  /**
   * GET request with URL parameter substitution
   */
  async get<T>(
    endpoint: string,
    params?: UrlParams,
    query?: QueryParams,
    config?: ${configType}
  ): Promise<BaseResponse<T>> {
    const url = generateUrl(endpoint, params, query);
    return super.get<T>(url, config);
  }

  /**
   * POST request with URL parameter substitution
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    params?: UrlParams,
    query?: QueryParams,
    config?: ${configType}
  ): Promise<BaseResponse<T>> {
    const url = generateUrl(endpoint, params, query);
    return super.post<T>(url, data, config);
  }

  /**
   * PUT request with URL parameter substitution
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    params?: UrlParams,
    query?: QueryParams,
    config?: ${configType}
  ): Promise<BaseResponse<T>> {
    const url = generateUrl(endpoint, params, query);
    return super.put<T>(url, data, config);
  }

  /**
   * DELETE request with URL parameter substitution
   */
  async delete<T>(
    endpoint: string,
    params?: UrlParams,
    query?: QueryParams,
    config?: ${configType}
  ): Promise<BaseResponse<T>> {
    const url = generateUrl(endpoint, params, query);
    return super.delete<T>(url, config);
  }
}
`;
}
