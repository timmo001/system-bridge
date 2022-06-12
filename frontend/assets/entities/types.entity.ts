export interface MediaType {
  alternativeText?: string;
  caption?: string;
  url: string;
}

export interface PageType {
  path: string;
  updated: string;
}

export interface NameValue {
  name: string;
  value: string;
}

export function instanceOfNameValue(data: any): data is NameValue {
  return "name" in data && "value" in data;
}
