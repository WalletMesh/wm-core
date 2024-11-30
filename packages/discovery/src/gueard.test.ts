import { describe, it, expect } from 'vitest';
import {
  isBaseWalletInfo,
  isWebWalletInfo,
  isExtensionWalletInfo,
  isDiscoveryRequestEvent,
  isDiscoveryResponseEvent,
  isDiscoveryAckEvent,
} from './guards.js';
import type {
  BaseWalletInfo,
  WebWalletInfo,
  ExtensionWalletInfo,
  DiscoveryRequestEvent,
  DiscoveryResponseEvent,
  DiscoveryAckEvent,
  WalletInfo,
} from './types.js';
import { WM_PROTOCOL_VERSION } from './constants.js';

describe('Type Guards', () => {
  describe('isBaseWalletInfo', () => {
    it('should return true for a valid BaseWalletInfo object', () => {
      const validWalletInfo: BaseWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isBaseWalletInfo(validWalletInfo)).toBe(true);
    });

    it('should return false if it is not an object', () => {
      expect(isBaseWalletInfo('test')).toBe(false);
    });

    it('should return false if it is null', () => {
      expect(isBaseWalletInfo(null)).toBe(false);
    });

    it('should return true for a valid BaseWalletInfo object without technologies', () => {
      const validWalletInfo: BaseWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
      };

      expect(isBaseWalletInfo(validWalletInfo)).toBe(true);
    });

    it('should return false if technologies is not an array of strings', () => {
      const invalidWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        technologies: [123],
      };

      expect(isBaseWalletInfo(invalidWalletInfo)).toBe(false);
    });

    it('should return false if technologies is an array of blank strings', () => {
      const invalidWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        technologies: ['    '],
      };

      expect(isBaseWalletInfo(invalidWalletInfo)).toBe(false);
    });

    it('should return false if technologies is an empty array', () => {
      const invalidWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        technologies: [],
      };

      expect(isBaseWalletInfo(invalidWalletInfo)).toBe(false);
    });

    it('should return false if name is not a string', () => {
      const invalidWalletInfo = {
        name: 123, // Not a string
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isBaseWalletInfo(invalidWalletInfo)).toBe(false);
    });

    it('should return false if icon is not a string', () => {
      const invalidWalletInfo = {
        name: 'Test Wallet',
        icon: 123, // Not a string
        rdns: 'com.test.wallet',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isBaseWalletInfo(invalidWalletInfo)).toBe(false);
    });

    it('should return false if rdns is not a string', () => {
      const invalidWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 123, // Not a string
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isBaseWalletInfo(invalidWalletInfo)).toBe(false);
    });

    it('should return false if technologies is not an array', () => {
      const invalidWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        technologies: 'bitcoin', // Not an array
      };

      expect(isBaseWalletInfo(invalidWalletInfo)).toBe(false);
    });
  });

  describe('isWebWalletInfo', () => {
    it('should return true for a valid WebWalletInfo object', () => {
      const validWebWallet: WebWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        url: 'https://test.wallet',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isWebWalletInfo(validWebWallet)).toBe(true);
    });

    it('should return true for a valid WebWalletInfo object without technologies', () => {
      const validWebWallet: WebWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        url: 'https://test.wallet',
      };

      expect(isWebWalletInfo(validWebWallet)).toBe(true);
    });

    it('should return false if name is not a string', () => {
      const invalidWebWallet = {
        name: 123, // Not a string
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        url: 'https://test.wallet',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isWebWalletInfo(invalidWebWallet)).toBe(false);
    });

    it('should return false if icon is not a string', () => {
      const invalidWebWallet = {
        name: 'Test Wallet',
        icon: 123, // Not a string
        rdns: 'com.test.wallet',
        url: 'https://test.wallet',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isWebWalletInfo(invalidWebWallet)).toBe(false);
    });

    it('should return false if rdns is not a string', () => {
      const invalidWebWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 123, // Not a string
        url: 'https://test.wallet',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isWebWalletInfo(invalidWebWallet)).toBe(false);
    });

    it('should return false if url is not a string', () => {
      const invalidWebWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        url: 123, // Not a string
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isWebWalletInfo(invalidWebWallet)).toBe(false);
    });

    it('should return false if technologies is not an array', () => {
      const invalidWebWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        url: 'https://test.wallet',
        technologies: 'bitcoin', // Not an array
      };

      expect(isWebWalletInfo(invalidWebWallet)).toBe(false);
    });

    it('should return false if code is defined', () => {
      const invalidWebWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        url: 'https://test.wallet',
        code: 'some-code', // Should not be defined
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isWebWalletInfo(invalidWebWallet)).toBe(false);
    });

    it('should return false if extensionId is defined', () => {
      const invalidWebWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        url: 'https://test.wallet',
        extensionId: 'some-extension-id', // Should not be defined
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isWebWalletInfo(invalidWebWallet)).toBe(false);
    });
  });

  describe('isExtensionWalletInfo', () => {
    it('should return true for a valid ExtensionWalletInfo object', () => {
      const validExtensionWallet: ExtensionWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        extensionId: 'test-extension-id',
        code: 'test-code',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isExtensionWalletInfo(validExtensionWallet)).toBe(true);
    });

    it('should return true for a valid ExtensionWalletInfo object without technologies', () => {
      const validExtensionWallet: ExtensionWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        extensionId: 'test-extension-id',
        code: 'test-code',
      };

      expect(isExtensionWalletInfo(validExtensionWallet)).toBe(true);
    });

    it('should return true for a valid ExtensionWalletInfo object without code', () => {
      const validExtensionWallet: ExtensionWalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        extensionId: 'test-extension-id',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isExtensionWalletInfo(validExtensionWallet)).toBe(true);
    });

    it('should return false if name is not a string', () => {
      const invalidExtensionWallet = {
        name: 123, // Not a string
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        extensionId: 'test-extension-id',
        code: 'test-code',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isExtensionWalletInfo(invalidExtensionWallet)).toBe(false);
    });

    it('should return false if icon is not a string', () => {
      const invalidExtensionWallet = {
        name: 'Test Wallet',
        icon: 123, // Not a string
        rdns: 'com.test.wallet',
        extensionId: 'test-extension-id',
        code: 'test-code',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isExtensionWalletInfo(invalidExtensionWallet)).toBe(false);
    });

    it('should return false if rdns is not a string', () => {
      const invalidExtensionWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 123, // Not a string
        extensionId: 'test-extension-id',
        code: 'test-code',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isExtensionWalletInfo(invalidExtensionWallet)).toBe(false);
    });

    it('should return false if extensionId is not a string', () => {
      const invalidExtensionWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        extensionId: 123, // Not a string
        code: 'test-code',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isExtensionWalletInfo(invalidExtensionWallet)).toBe(false);
    });

    it('should return false if code is not a string or undefined', () => {
      const invalidExtensionWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        extensionId: 'test-extension-id',
        code: 123, // Not a string or undefined
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isExtensionWalletInfo(invalidExtensionWallet)).toBe(false);
    });

    it('should return false if url is defined', () => {
      const invalidExtensionWallet = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
        extensionId: 'test-extension-id',
        code: 'test-code',
        url: 'https://test.wallet', // Should not be defined
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isExtensionWalletInfo(invalidExtensionWallet)).toBe(false);
    });
  });

  describe('isDiscoveryRequestEvent', () => {
    it('should return true for a valid DiscoveryRequestEvent object', () => {
      const validEvent: DiscoveryRequestEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isDiscoveryRequestEvent(validEvent)).toBe(true);
    });

    it('should return false if it is not an object', () => {
      expect(isDiscoveryRequestEvent('test')).toBe(false);
    });

    it('should return false if it is null', () => {
      expect(isDiscoveryRequestEvent(null)).toBe(false);
    });

    it('should return false if version is incorrect', () => {
      const invalidEvent = {
        version: 'invalid-version',
        discoveryId: 'test-discovery-id',
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isDiscoveryRequestEvent(invalidEvent)).toBe(false);
    });

    it('should return false if discoveryId is not a string', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 123, // Not a string
        technologies: ['bitcoin', 'ethereum'],
      };

      expect(isDiscoveryRequestEvent(invalidEvent)).toBe(false);
    });

    it('should return true if technologies is undefined', () => {
      const validEvent: DiscoveryRequestEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
      };

      expect(isDiscoveryRequestEvent(validEvent)).toBe(true);
    });

    it('should return false if technologies is not an array', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: 'bitcoin', // Not an array
      };

      expect(isDiscoveryRequestEvent(invalidEvent)).toBe(false);
    });

    it('should return false if technology is not a string', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: [123], // Not an array of strings
      };

      expect(isDiscoveryRequestEvent(invalidEvent)).toBe(false);
    });

    it('should return false if technology is a blank string', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['    '], // Blank strings are not allowed
      };

      expect(isDiscoveryRequestEvent(invalidEvent)).toBe(false);
    });

    it('should return false if technology is an empty array', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: [],
      };

      expect(isDiscoveryRequestEvent(invalidEvent)).toBe(false);
    });
  });

  describe('isDiscoveryResponseEvent', () => {
    it('should return true for a valid DiscoveryResponseEvent object', () => {
      const validWalletInfo: WalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
      };

      const validEvent: DiscoveryResponseEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        wallet: validWalletInfo,
        walletId: 'test-wallet-id',
      };

      expect(isDiscoveryResponseEvent(validEvent)).toBe(true);
    });

    it('should return false if it is not an object', () => {
      expect(isDiscoveryResponseEvent('test')).toBe(false);
    });

    it('should return false if it is null', () => {
      expect(isDiscoveryResponseEvent(null)).toBe(false);
    });

    it('should return false if version is incorrect', () => {
      const validWalletInfo: WalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
      };

      const invalidEvent = {
        version: 'invalid-version',
        discoveryId: 'test-discovery-id',
        wallet: validWalletInfo,
        walletId: 'test-wallet-id',
      };

      expect(isDiscoveryResponseEvent(invalidEvent)).toBe(false);
    });

    it('should return false if discoveryId is not a string', () => {
      const validWalletInfo: WalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
      };

      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 123, // Not a string
        wallet: validWalletInfo,
        walletId: 'test-wallet-id',
      };

      expect(isDiscoveryResponseEvent(invalidEvent)).toBe(false);
    });

    it('should return false if wallet is missing', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        // Missing wallet
        walletId: 'test-wallet-id',
      };

      expect(isDiscoveryResponseEvent(invalidEvent)).toBe(false);
    });

    it('should return false if wallet is not an object', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        wallet: 'invalid-wallet', // Not an object
        walletId: 'test-wallet-id',
      };

      expect(isDiscoveryResponseEvent(invalidEvent)).toBe(false);
    });

    it('should return false if walletId is not a string', () => {
      const validWalletInfo: WalletInfo = {
        name: 'Test Wallet',
        icon: 'test-icon',
        rdns: 'com.test.wallet',
      };

      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        wallet: validWalletInfo,
        walletId: 123, // Not a string
      };

      expect(isDiscoveryResponseEvent(invalidEvent)).toBe(false);
    });
  });

  describe('isDiscoveryAckEvent', () => {
    it('should return true for a valid DiscoveryAckEvent object', () => {
      const validEvent: DiscoveryAckEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        walletId: 'test-wallet-id',
      };

      expect(isDiscoveryAckEvent(validEvent)).toBe(true);
    });

    it('should return false if it is not an object', () => {
      expect(isDiscoveryAckEvent('test')).toBe(false);
    });

    it('should return false if it is null', () => {
      expect(isDiscoveryAckEvent(null)).toBe(false);
    });

    it('should return false if version is incorrect', () => {
      const invalidEvent = {
        version: 'invalid-version',
        discoveryId: 'test-discovery-id',
        walletId: 'test-wallet-id',
      };

      expect(isDiscoveryAckEvent(invalidEvent)).toBe(false);
    });

    it('should return false if discoveryId is not a string', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 123, // Not a string
        walletId: 'test-wallet-id',
      };

      expect(isDiscoveryAckEvent(invalidEvent)).toBe(false);
    });

    it('should return false if walletId is not a string', () => {
      const invalidEvent = {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        walletId: 123, // Not a string
      };

      expect(isDiscoveryAckEvent(invalidEvent)).toBe(false);
    });
  });
});
