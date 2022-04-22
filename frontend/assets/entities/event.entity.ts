export interface Event {
  type: string;
  message: string;
  id?: string;
  modules?: Array<string>;
  module?: string;
  data?: any;
}
