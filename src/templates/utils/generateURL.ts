export function generateUrlTemplate(): string {
  return `// URL Generator Utility

export type UrlParams = Record<string, string | number>;
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export function generateUrl(
  route: string,
  params?: UrlParams,
  query?: QueryParams
): string {
  let url = route;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(\`:$\{key}\`, encodeURIComponent(String(value)));
    });
  }

  if (query) {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += \`?$\{queryString}\`;
    }
  }

  return url;
}
`;
}
