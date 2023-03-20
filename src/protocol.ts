

export type Sendable = boolean | Date | RegExp | string | undefined | number | BigInt | Sendable[] | Set<Sendable> | Map<Sendable, Sendable> | ArrayBuffer | DataView | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array | { [key: string]: Sendable; };


export const enum WireValueType {
  RAW = "RAW",
  PROXY = "PROXY",
  THROW = "THROW",
  HANDLER = "HANDLER",
}

export interface RawWireValue {
  id?: string;
  type: WireValueType.RAW;
  value: Sendable;
}

export interface HandlerWireValue {
  id?: string;
  type: WireValueType.HANDLER;
  name: string;
  value: unknown;
}

export type WireValue = RawWireValue | HandlerWireValue;

export type MessageID = string;

export const enum MessageType {
  GET = "GET",
  SET = "SET",
  APPLY = "APPLY",
  CONSTRUCT = "CONSTRUCT",
  RELEASE = "RELEASE",
}

export type Argument = {
  value: WireValue;
  portCount: number;
};

export interface GetMessage {
  id?: MessageID;
  type: MessageType.GET;
  path: string[];
}

export interface SetMessage {
  id?: MessageID;
  type: MessageType.SET;
  path: string[];
  value: WireValue;
}

export interface ApplyMessage {
  id?: MessageID;
  type: MessageType.APPLY;
  path: string[];
  argumentList: Argument[];
}

export interface ConstructMessage {
  id?: MessageID;
  type: MessageType.CONSTRUCT;
  path: string[];
  argumentList: Argument[];
}

export interface ReleaseMessage {
  id?: MessageID;
  type: MessageType.RELEASE;
  path: string[];
}

export type Message =
  | GetMessage
  | SetMessage
  | ApplyMessage
  | ConstructMessage
  | ReleaseMessage;