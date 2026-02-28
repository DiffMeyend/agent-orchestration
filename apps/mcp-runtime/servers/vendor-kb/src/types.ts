export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: any;
}

export interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: number | string | null;
  result: unknown;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  id: number | string | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;
