export interface Event {
  name: string;
  service?: string;
  method?: "findAll" | string;
  data?: any;
}
