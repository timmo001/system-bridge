import axios, { AxiosResponse, Method, RawAxiosRequestConfig } from "axios";

export interface APIRequest {
  body?: NodeJS.Dict<any>;
  endpoint: string;
  method: Method;
  params?: NodeJS.Dict<any>;
}

export class API {
  private apiKey: string;
  public port: number;

  constructor(port: number, apiKey: string) {
    this.apiKey = apiKey;
    this.port = port || 9170;
  }

  async request<T = any>({
    body,
    endpoint,
    method,
    params,
  }: APIRequest): Promise<AxiosResponse<T>> {
    const config: RawAxiosRequestConfig = {
      baseURL: `http://localhost:${this.port}`,
      data: body,
      headers: {
        "api-key": this.apiKey,
      },
      method,
      params,
      url: `/api/${endpoint}`,
    };
    return await axios.request<T, AxiosResponse>(config);
  }
}
