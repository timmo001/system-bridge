import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";

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
    const config: AxiosRequestConfig = {
      baseURL: `http://localhost:${this.port}`,
      data: body,
      headers: {
        "api-key": this.apiKey,
      },
      method,
      params,
      url: `/${endpoint}`,
    };
    return await axios.request<T, AxiosResponse>(config);
  }
}
