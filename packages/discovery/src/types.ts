import type { WM_PROTOCOL_VERSION } from './constants.js';

export interface BaseWalletInfo {
  name: string;
  icon: string;
  rdns: string;
  technologies?: string[] | undefined;
}

export interface ExtensionWalletInfo extends BaseWalletInfo {
  extensionId?: string | undefined;
  code?: string | undefined;
  url?: never | undefined; // Cannot have URL
}

export interface WebWalletInfo extends BaseWalletInfo {
  url?: string | undefined;
  code?: never | undefined; // Cannot have code
  extensionId?: never | undefined; // Cannot have extensionId
}

// Combined type
export type WalletInfo = ExtensionWalletInfo | WebWalletInfo;

export interface DiscoveryRequestEvent {
  version: typeof WM_PROTOCOL_VERSION;
  discoveryId: string;
  technologies?: string[] | undefined;
}

export interface DiscoveryResponseEvent {
  version: typeof WM_PROTOCOL_VERSION;
  discoveryId: string;
  wallet: WalletInfo;
  walletId: string;
}

export interface DiscoveryAckEvent {
  version: typeof WM_PROTOCOL_VERSION;
  discoveryId: string;
  walletId: string;
}
