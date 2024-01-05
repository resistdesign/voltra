import { mergeStringPaths } from '../../common/utils/Routing';

export type ServiceConfig = {
  protocol: string;
  domain: string;
  port?: number;
  basePath?: string;
  authorization?: string;
};

export const getFullUrl = (
  protocol: string,
  domain: string,
  basePath: string = '',
  path: string = '',
  port?: number
): string => {
  const portString = !!port ? `:${port}` : '';
  const fullPath = mergeStringPaths(basePath, path);

  return `${protocol}://${domain}${portString}${fullPath}`;
};

export const sendServiceRequest = async (config: ServiceConfig, path: string = '', args: any[] = []): Promise<any> => {
  const { protocol, domain, port, basePath = '', authorization = '' } = config;
  const fullUrl = getFullUrl(protocol, domain, basePath, path, port);
  const requestHeaders = !!authorization
    ? {
        Authorization: `Bearer ${authorization}`,
      }
    : undefined;
  const response = await fetch(fullUrl, {
    headers: requestHeaders,
    credentials: 'same-origin',
    method: 'POST',
    body: JSON.stringify(args),
  });
  const data = await response.json();

  return data;
};
