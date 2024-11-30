import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DiscoveryAnnouncer } from './client.js';
import type { DiscoveryAnnouncerOptions } from './client.js';
import type { WalletInfo, DiscoveryRequestEvent, DiscoveryAckEvent } from './types.js';
import { WmDiscovery, WM_PROTOCOL_VERSION } from './constants.js';

/**
 * @vitest-environment jsdom
 */

describe('DiscoveryAnnouncer', () => {
  let discoveryAnnouncerOptions: DiscoveryAnnouncerOptions;
  let discoveryAnnouncer: DiscoveryAnnouncer;
  let mockEventTarget: EventTarget;
  let mockWallet: WalletInfo;

  beforeEach(() => {
    mockEventTarget = new EventTarget();
    mockWallet = {
      name: 'Test Wallet',
      icon: 'test-icon.png',
      rdns: 'com.example.testwallet',
      url: 'https://wallet.example.com',
    };
    discoveryAnnouncerOptions = {
      walletInfo: mockWallet,
      supportedTechnologies: ['aztec'],
      sessionId: 'wallet-123',
      eventTarget: mockEventTarget,
    };
    discoveryAnnouncer = new DiscoveryAnnouncer(discoveryAnnouncerOptions);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should set walletInfo to the provided value in the constructor', () => {
    const discoveryAnnouncer = new DiscoveryAnnouncer({ walletInfo: mockWallet });

    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['walletInfo']).toEqual(mockWallet);
  });

  it('should throw an error if walletInfo is invalid', () => {
    const invalidWalletInfo = { name: '', icon: '', rdns: '' };

    expect(() => {
      new DiscoveryAnnouncer({ walletInfo: invalidWalletInfo as WalletInfo });
    }).toThrow('Invalid walletInfo: ${walletInfo}');
  });

  it('should set sessionId to the provided value in the constructor', () => {
    const sessionId = 'test-session-id';
    const discoveryAnnouncer = new DiscoveryAnnouncer({ walletInfo: mockWallet, sessionId });

    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['sessionId']).toEqual(sessionId);
  });

  it('should set sessionId to a new UUID if not provided in the constructor', () => {
    const discoveryAnnouncer = new DiscoveryAnnouncer({ walletInfo: mockWallet });

    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['sessionId']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should set supportedTechnologies to the provided value in the constructor', () => {
    const supportedTechnologies = ['aztec'];
    const discoveryAnnouncer = new DiscoveryAnnouncer({ walletInfo: mockWallet, supportedTechnologies });

    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['supportedTechnologies']).toEqual(supportedTechnologies);
  });

  it('should set supportedTechnologies to an empty array if not provided in the constructor', () => {
    const discoveryAnnouncer = new DiscoveryAnnouncer({ walletInfo: mockWallet });

    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['supportedTechnologies']).toEqual([]);
  });

  it('should set eventTarget to the provided value in the constructor', () => {
    const discoveryAnnouncer = new DiscoveryAnnouncer({
      walletInfo: mockWallet,
      eventTarget: mockEventTarget,
    });

    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['eventTarget']).toEqual(mockEventTarget);
  });

  it('should set eventTarget to window if not provided in the constructor', () => {
    const discoveryAnnouncer = new DiscoveryAnnouncer({ walletInfo: mockWallet });

    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['eventTarget']).toEqual(window);
  });

  it('should call startEventListeners when start is called', () => {
    // biome-ignore lint/suspicious/noExplicitAny: Testing private method
    const startEventListenersSpy = vi.spyOn(discoveryAnnouncer as any, 'startEventListeners');

    discoveryAnnouncer.start();

    expect(startEventListenersSpy).toHaveBeenCalled();
  });

  it('should dispatch the "Ready" event when start is called', () => {
    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Ready, handler);
    const dispatchEventSpy = vi.spyOn(mockEventTarget, 'dispatchEvent');

    discoveryAnnouncer.start();

    expect(handler).toHaveBeenCalled();

    const eventArg = handler.mock.calls[0]?.[0];
    expect(eventArg.type).toBe(WmDiscovery.Ready);

    expect(dispatchEventSpy).toHaveBeenCalledWith(new CustomEvent(WmDiscovery.Ready));
  });

  it('should remove event listeners when stop is called', () => {
    // Spy on the stopEventListeners method
    // biome-ignore lint/suspicious/noExplicitAny: Testing private method
    const stopEventListenersSpy = vi.spyOn(discoveryAnnouncer as any, 'stopEventListeners');

    // Call the stop method
    discoveryAnnouncer.stop();

    // Verify the stopEventListeners method was called
    expect(stopEventListenersSpy).toHaveBeenCalled();
  });

  it('should clear acknowledgedDiscoveryIds when stop is called', () => {
    // Add some discovery IDs to the acknowledgedDiscoveryIds set
    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['acknowledgedDiscoveryIds'].add('discovery-id-1');

    // Call the stop method
    discoveryAnnouncer.stop();

    // Verify the acknowledgedDiscoveryIds set was cleared
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['acknowledgedDiscoveryIds'].size).toBe(0);
  });

  it('should clear pendingDiscoveryIds when stop is called', () => {
    // Add some discovery IDs to the pendingDiscoveryIds set
    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['pendingDiscoveryIds'].add('discovery-id-2');

    // Call the stop method
    discoveryAnnouncer.stop();

    // Verify the pendingDiscoveryIds set was cleared
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['pendingDiscoveryIds'].size).toBe(0);
  });

  it('should handle valid DiscoveryRequestEvent and call dispatchDiscoveryResponseEvent', () => {
    const validRequestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['aztec'],
      },
    });

    const dispatchDiscoveryResponseEventSpy = vi.spyOn(
      // biome-ignore lint/suspicious/noExplicitAny: Testing private method
      discoveryAnnouncer as any,
      'dispatchDiscoveryResponseEvent',
    );

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(validRequestEvent);

    // Verify the dispatchDiscoveryResponseEvent method was called
    expect(dispatchDiscoveryResponseEventSpy).toHaveBeenCalled();
  });

  it('should not respond to the same discvoery ID after it has received an ack', () => {
    const validRequestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['aztec'],
      },
    });

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);
    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['acknowledgedDiscoveryIds'].add('test-discovery-id');

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(validRequestEvent);

    // Verify the handler was not called
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not dispatch DiscoveryResponseEvent if technologies do not match', () => {
    const requestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['unsupported-tech'],
      },
    });

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(requestEvent);

    // Verify the handler was not called
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not dispatch DiscoveryResponseEvent if the event is invalid', () => {
    const invalidRequestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: 'invalid-version',
        discoveryId: 'test-discovery-id',
        technologies: ['aztec'],
      },
    });

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(invalidRequestEvent);

    // Verify the handler was not called
    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle valid DiscoveryAckEvent and update internal state', () => {
    const validAckEvent = new CustomEvent<DiscoveryAckEvent>(WmDiscovery.Ack, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        // biome-ignore lint: Accessing private property for testing
        walletId: discoveryAnnouncer['sessionId'],
      },
    });

    // Add the discovery ID to the pending set
    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['pendingDiscoveryIds'].add('test-discovery-id');

    discoveryAnnouncer.start();

    // Dispatch the acknowledgment event
    mockEventTarget.dispatchEvent(validAckEvent);

    // Verify the discovery ID was moved from pending to acknowledged
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['pendingDiscoveryIds'].has('test-discovery-id')).toBe(false);
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['acknowledgedDiscoveryIds'].has('test-discovery-id')).toBe(true);
  });

  it('should not update internal state if the event is invalid', () => {
    const invalidAckEvent = new CustomEvent<DiscoveryAckEvent>(WmDiscovery.Ack, {
      detail: {
        version: 'invalid-version',
        discoveryId: 'test-discovery-id',
        // biome-ignore lint: Accessing private property for testing
        walletId: discoveryAnnouncer['sessionId'],
      },
    });

    // Add the discovery ID to the pending set
    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['pendingDiscoveryIds'].add('test-discovery-id');

    discoveryAnnouncer.start();

    // Dispatch the acknowledgment event
    mockEventTarget.dispatchEvent(invalidAckEvent);

    // Verify the internal state was not updated
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['pendingDiscoveryIds'].has('test-discovery-id')).toBe(true);
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['acknowledgedDiscoveryIds'].has('test-discovery-id')).toBe(false);
  });

  it('should not update internal state if the acknowledgment is not for the current session', () => {
    const ackEvent = new CustomEvent<DiscoveryAckEvent>(WmDiscovery.Ack, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        walletId: 'different-session-id',
      },
    });

    // Add the discovery ID to the pending set
    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['pendingDiscoveryIds'].add('test-discovery-id');

    discoveryAnnouncer.start();

    // Dispatch the acknowledgment event
    mockEventTarget.dispatchEvent(ackEvent);

    // Verify the internal state was not updated
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['pendingDiscoveryIds'].has('test-discovery-id')).toBe(true);
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['acknowledgedDiscoveryIds'].has('test-discovery-id')).toBe(false);
  });

  it('should not update internal state if the discovery ID is not pending', () => {
    const ackEvent = new CustomEvent<DiscoveryAckEvent>(WmDiscovery.Ack, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'non-pending-discovery-id',
        // biome-ignore lint: Accessing private property for testing
        walletId: discoveryAnnouncer['sessionId'],
      },
    });

    discoveryAnnouncer.start();

    // Dispatch the acknowledgment event
    mockEventTarget.dispatchEvent(ackEvent);

    // Verify the internal state was not updated
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['pendingDiscoveryIds'].has('non-pending-discovery-id')).toBe(false);
    // biome-ignore lint: Accessing private property for testing
    expect(discoveryAnnouncer['acknowledgedDiscoveryIds'].has('non-pending-discovery-id')).toBe(false);
  });

  it('should dispatch a DiscoveryResponseEvent with the correct details', () => {
    const discoveryId = 'test-discovery-id';
    const matchingTechnologies = ['aztec', 'evm'];
    const expectedWalletInfo = mockWallet;
    expectedWalletInfo.technologies = matchingTechnologies;

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    // Call the method
    // biome-ignore lint/suspicious/noExplicitAny: Testing private method
    (discoveryAnnouncer as any).dispatchDiscoveryResponseEvent(discoveryId, matchingTechnologies);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId,
      wallet: expectedWalletInfo,
      // biome-ignore lint: Accessing private property for testing
      walletId: discoveryAnnouncer['sessionId'],
    });
  });

  it('should dispatch a DiscoveryResponseEvent with the correct details (extensionId)', () => {
    const discoveryId = 'test-discovery-id';
    const matchingTechnologies = ['aztec', 'evm'];
    const walletWithExtensionId = {
      name: 'Test Wallet',
      icon: 'test-icon.png',
      rdns: 'com.example.testwallet',
      extensionId: 'test-extension-id',
    } as WalletInfo;
    const expectedWalletInfo = walletWithExtensionId;
    expectedWalletInfo.technologies = matchingTechnologies;

    const discoveryAnnouncer = new DiscoveryAnnouncer({
      walletInfo: walletWithExtensionId,
      eventTarget: mockEventTarget,
      sessionId: 'wallet-123',
    });

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    // Call the method
    // biome-ignore lint/suspicious/noExplicitAny: Testing private method
    (discoveryAnnouncer as any).dispatchDiscoveryResponseEvent(discoveryId, matchingTechnologies);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId,
      wallet: expectedWalletInfo,
      // biome-ignore lint: Accessing private property for testing
      walletId: discoveryAnnouncer['sessionId'],
    });
  });

  it('should dispatch a DiscoveryResponseEvent with the correct details (code)', () => {
    const discoveryId = 'test-discovery-id';
    const matchingTechnologies = ['aztec', 'evm'];
    const walletWithCode = {
      name: 'Test Wallet',
      icon: 'test-icon.png',
      rdns: 'com.example.testwallet',
      code: 'test-code',
    } as WalletInfo;
    const expectedWalletInfo = walletWithCode;
    expectedWalletInfo.technologies = matchingTechnologies;

    const discoveryAnnouncer = new DiscoveryAnnouncer({
      walletInfo: walletWithCode,
      eventTarget: mockEventTarget,
      sessionId: 'wallet-123',
    });

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    // Call the method
    // biome-ignore lint/suspicious/noExplicitAny: Testing private method
    (discoveryAnnouncer as any).dispatchDiscoveryResponseEvent(discoveryId, matchingTechnologies);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId,
      wallet: expectedWalletInfo,
      // biome-ignore lint: Accessing private property for testing
      walletId: discoveryAnnouncer['sessionId'],
    });
  });

  it('should dispatch a DiscoveryResponseEvent with the correct details (url)', () => {
    const discoveryId = 'test-discovery-id';
    const matchingTechnologies = ['aztec', 'evm'];
    const walletWithUrl = {
      name: 'Test Wallet',
      icon: 'test-icon.png',
      rdns: 'com.example.testwallet',
      url: 'https://wallet.example.com',
    } as WalletInfo;
    const expectedWalletInfo = walletWithUrl;
    expectedWalletInfo.technologies = matchingTechnologies;

    const discoveryAnnouncer = new DiscoveryAnnouncer({
      walletInfo: walletWithUrl,
      eventTarget: mockEventTarget,
      sessionId: 'wallet-123',
    });

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    // Call the method
    // biome-ignore lint/suspicious/noExplicitAny: Testing private method
    (discoveryAnnouncer as any).dispatchDiscoveryResponseEvent(discoveryId, matchingTechnologies);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId,
      wallet: expectedWalletInfo,
      // biome-ignore lint: Accessing private property for testing
      walletId: discoveryAnnouncer['sessionId'],
    });
  });

  it('should dispatch a DiscoveryResponseEvent without a technologies array if no matching technologies are provided', () => {
    const discoveryId = 'test-discovery-id';
    const matchingTechnologies: string[] = [];

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    // Call the method
    // biome-ignore lint/suspicious/noExplicitAny: Testing private method
    (discoveryAnnouncer as any).dispatchDiscoveryResponseEvent(discoveryId, matchingTechnologies);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId,
      wallet: mockWallet,
      // biome-ignore lint: Accessing private property for testing
      walletId: discoveryAnnouncer['sessionId'],
    });
  });

  it('should filter and only include matching technologies', () => {
    const requestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['aztec', 'evm'],
      },
    });

    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['supportedTechnologies'] = ['aztec', 'evm', 'bitcon'];

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(requestEvent);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail.wallet.technologies).toEqual(['aztec', 'evm']);
  });

  it('should have case insensitive matching and filtering', () => {
    const requestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['AZTEC', 'EVM'],
      },
    });

    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['supportedTechnologies'] = ['aztec', 'evm', 'bitcon'];

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(requestEvent);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail.wallet.technologies).toEqual(['AZTEC', 'EVM']);
  });

  it('should match the case in the request', () => {
    const requestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['aztec', 'EVM'],
      },
    });

    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['supportedTechnologies'] = ['AZTEC', 'EVM', 'bitcon'];

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(requestEvent);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail.wallet.technologies).toEqual(['aztec', 'EVM']);
  });

  it('should not include technology unless in request', () => {
    const requestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
      },
    });

    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['supportedTechnologies'] = ['AZTEC', 'EVM', 'bitcon'];

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(requestEvent);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0];

    // Verify the response event details
    expect(eventArg.detail.wallet.technologies).not.exist;
  });

  it('should not respond if technology does not have at least one match', () => {
    const requestEvent = new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        technologies: ['aztec'],
      },
    });

    // biome-ignore lint: Accessing private property for testing
    discoveryAnnouncer['supportedTechnologies'] = [];

    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Response, handler);

    discoveryAnnouncer.start();

    // Dispatch the request event
    mockEventTarget.dispatchEvent(requestEvent);

    // Verify the handler was called
    expect(handler).not.toHaveBeenCalled();
  });
});
