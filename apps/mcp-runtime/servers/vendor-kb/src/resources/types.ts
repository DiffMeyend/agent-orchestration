export interface ResourceDescriptor {
  uri: string;
  name: string;
  description: string;
  type: "entry" | "category";
}

export interface ResourcePayload {
  descriptor: ResourceDescriptor;
  data: unknown;
}
