export interface WebSocketRequest {
  token: string;
  id: string;
  event: string;
  data: Record<string, any>;
}

export interface WebSocketResponse extends Event {
  id: string;
  type: string;
  data: Record<string, any> | any[];
  subtype: string | null;
  message: string | null;
  module: string | null;
}
