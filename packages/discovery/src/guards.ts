import type {
  WalletInfo,
  BaseWalletInfo,
  ExtensionWalletInfo,
  WebWalletInfo,
  DiscoveryRequestEvent,
  DiscoveryResponseEvent,
  DiscoveryAckEvent,
} from './types.js';
import { WM_PROTOCOL_VERSION } from './constants.js';

/**
 * Type Guard to check if an object is BaseWalletInfo
 * @param obj - The object to validate
 * @returns True if obj is BaseWalletInfo, else false
 */
export function isWalletInfo(obj: unknown): obj is WalletInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  if (!(isWebWalletInfo(obj) || isExtensionWalletInfo(obj))) {
    return false;
  }
  return true;
}

/**
 * Type Guard to check if an object is BaseWalletInfo
 * @param obj - The object to validate
 * @returns True if obj is BaseWalletInfo, else false
 */
export function isBaseWalletInfo(obj: unknown): obj is BaseWalletInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Cast to any to check properties
  const wallet = obj as Partial<BaseWalletInfo>;

  // Required string fields
  if (typeof wallet.name !== 'string' || wallet.name.trim() === '') {
    return false;
  }

  if (typeof wallet.icon !== 'string' || wallet.icon.trim() === '') {
    return false;
  }

  if (typeof wallet.rdns !== 'string' || wallet.rdns.trim() === '') {
    return false;
  }

  // Optional technologies array
  if ('technologies' in wallet) {
    if (!Array.isArray(wallet.technologies)) {
      return false;
    }
    if (wallet.technologies.length === 0) {
      return false;
    }
    if (
      !wallet.technologies.every(
        (technology: string) => typeof technology === 'string' && technology.trim() !== '',
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Type Guard to check if an object is BaseWalletInfo
 * @param obj - The object to validate
 * @returns True if obj is BaseWalletInfo, else false
 */
export function isExtensionWalletInfo(obj: unknown): obj is ExtensionWalletInfo {
  if (!isBaseWalletInfo(obj)) {
    return false;
  }

  // May have extensionId or code and no url
  if ('url' in obj) {
    return false;
  }

  const wallet = obj as ExtensionWalletInfo;
  if (
    'extensionId' in wallet &&
    (typeof wallet.extensionId !== 'string' || wallet.extensionId.trim() === '')
  ) {
    return false;
  }
  if ('code' in wallet && (typeof wallet.code !== 'string' || wallet.code.trim() === '')) {
    return false;
  }
  return true;
}

/**
 * Type Guard to check if an object is BaseWalletInfo
 * @param obj - The object to validate
 * @returns True if obj is BaseWalletInfo, else false
 */
export function isWebWalletInfo(obj: unknown): obj is WebWalletInfo {
  if (!isBaseWalletInfo(obj)) {
    return false;
  }

  // Must have url and no extensionId or code
  if (!('url' in obj)) {
    return false;
  }
  if ('extensionId' in obj) {
    return false;
  }
  if ('code' in obj) {
    return false;
  }

  const wallet = obj as WebWalletInfo;
  if (typeof wallet.url !== 'string' || wallet.url.trim() === '') {
    return false;
  }

  return true;
}

/**
 * Type Guard to check if an object is AnnounceRequestEvent.
 * @param obj - The object to validate.
 * @returns True if obj is AnnounceRequestEvent, else false.
 */
export function isDiscoveryRequestEvent(obj_: unknown): obj_ is DiscoveryRequestEvent {
  const obj = obj_ as DiscoveryRequestEvent;
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  if (obj.version !== WM_PROTOCOL_VERSION) {
    return false;
  }

  if (typeof obj.discoveryId !== 'string' || obj.discoveryId.trim() === '') {
    return false;
  }

  if ('technologies' in obj) {
    if (!Array.isArray(obj.technologies)) {
      return false;
    }

    if (obj.technologies.length === 0) {
      return false;
    }

    for (const tech of obj.technologies) {
      if (typeof tech !== 'string' || tech.trim() === '') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Type Guard to check if an object is AnnounceResponseEvent.
 * @param obj - The object to validate.
 * @returns True if obj is AnnounceResponseEvent, else false.
 */
export function isDiscoveryResponseEvent(obj_: unknown): obj_ is DiscoveryResponseEvent {
  const obj = obj_ as DiscoveryResponseEvent;

  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  if (obj.version !== WM_PROTOCOL_VERSION) {
    return false;
  }

  if (typeof obj.discoveryId !== 'string' || obj.discoveryId.trim() === '') {
    return false;
  }

  if (!('wallet' in obj)) {
    return false;
  }

  if (!isWalletInfo(obj.wallet)) {
    return false;
  }

  if (typeof obj.walletId !== 'string' || obj.walletId.trim() === '') {
    return false;
  }

  return true;
}

/**
 * Type Guard to check if an object is AckEvent.
 * @param obj - The object to validate.
 * @returns True if obj is AckEvent, else false.
 */
export function isDiscoveryAckEvent(obj_: unknown): obj_ is DiscoveryAckEvent {
  const obj = obj_ as DiscoveryAckEvent;

  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Validate the version
  if (obj.version !== WM_PROTOCOL_VERSION) {
    return false;
  }

  // Validate the discoveryId
  if (typeof obj.discoveryId !== 'string' || obj.discoveryId.trim() === '') {
    return false;
  }

  // Validate the walletId
  if (typeof obj.walletId !== 'string' || obj.walletId.trim() === '') {
    return false;
  }

  return true;
}
