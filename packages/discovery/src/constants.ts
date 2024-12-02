export const WM_PROTOCOL_VERSION: string = '1.0.0';

export enum WmDiscovery {
  Ready = 'wm:discovery:ready',
  Request = 'wm:discovery:request',
  Response = 'wm:discovery:response',
  Ack = 'wm:discovery:ack',
}

export const CONFIG = Object.freeze({
  readyDebounceMs: 100,
} as const);
