import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { DiscoveryListener } from './server.js';
import type { DiscoveryListenerOptions } from './server.js';
import type { WalletInfo, DiscoveryResponseEvent, DiscoveryAckEvent } from './types.js';
import { WmDiscovery, WM_PROTOCOL_VERSION } from './constants.js';
import { CONFIG } from './constants.js';
import { isDiscoveryResponseEvent, isDiscoveryAckEvent } from './guards.js';

/**
 * @vitest-environment jsdom
 */

describe('DiscoveryListener', () => {
  let discoveryListenerOptions: DiscoveryListenerOptions;
  let discoveryListener: DiscoveryListener;
  let mockEventTarget: EventTarget;
  let mockCallback: Mock;

  beforeEach(() => {
    mockEventTarget = new EventTarget();
    mockCallback = vi.fn();

    discoveryListenerOptions = {
      technologies: ['aztec'],
      discoveryId: 'test-discovery-id',
      callback: mockCallback,
      eventTarget: mockEventTarget,
    };

    discoveryListener = new DiscoveryListener(discoveryListenerOptions);
  });

  afterEach(() => {
    discoveryListener.stop();
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it('should set technologies to the provided value in the constructor', () => {
    const technologies = ['aztec'];
    const discoveryListener = new DiscoveryListener({ technologies });

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['technologies']).toEqual(technologies);
  });

  it('should set technologies to an empty array if not provided in the constructor', () => {
    const discoveryListener = new DiscoveryListener({});

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['technologies']).toEqual([]);
  });

  it('should set discoveryId to the provided value in the constructor', () => {
    const discoveryId = 'test-discovery-id';
    const discoveryListener = new DiscoveryListener({ discoveryId });

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['discoveryId']).toEqual(discoveryId);
  });

  it('should set discoveryId to a new UUID if not provided in the constructor', () => {
    const discoveryListener = new DiscoveryListener({});

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['discoveryId']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should set callback to the provided value in the constructor', () => {
    const callback = mockCallback;
    const discoveryListener = new DiscoveryListener({ callback });

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['callback']).toEqual(callback);
  });

  it('should set callback to null if not provided in the constructor', () => {
    const discoveryListener = new DiscoveryListener({});

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['callback']).toBeNull();
  });

  it('should set eventTarget to the provided value in the constructor', () => {
    const discoveryListener = new DiscoveryListener({ eventTarget: mockEventTarget });

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['eventTarget']).toEqual(mockEventTarget);
  });

  it('should set eventTarget to window if not provided in the constructor', () => {
    const discoveryListener = new DiscoveryListener({});

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['eventTarget']).toEqual(window);
  });

  it('should start the event listeners upon calling start()', () => {
    // biome-ignore lint/suspicious/noExplicitAny: Used for testing
    const startEventListenersSpy = vi.spyOn(discoveryListener as any, 'startEventListeners');

    discoveryListener.start();

    // Verify the stopEventListeners method was called
    expect(startEventListenersSpy).toHaveBeenCalled();

    expect(startEventListenersSpy).toHaveBeenCalled();
  });

  it('should dispatch a DiscoveryRequestEvent upon calling start()', () => {
    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Request, handler);

    discoveryListener.start();

    expect(handler).toHaveBeenCalled();

    const eventArg = handler.mock.calls[0]?.[0];
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId: 'test-discovery-id',
      technologies: ['aztec'],
    });
  });

  it('should dispatch a DiscoveryRequestEvent with technologies', () => {
    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Request, handler);

    discoveryListener.start();

    expect(handler).toHaveBeenCalled();

    const eventArg = handler.mock.calls[0]?.[0];
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId: 'test-discovery-id',
      technologies: ['aztec'],
    });
  });

  it('should dispatch a DiscoveryRequestEvent without technologies if empty', () => {
    const discoverListenerOptions = {
      discoveryId: 'test-discovery-id',
      callback: mockCallback,
      eventTarget: mockEventTarget,
    };

    discoveryListener = new DiscoveryListener(discoverListenerOptions);
    const handler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Request, handler);

    discoveryListener.start();

    expect(handler).toHaveBeenCalled();

    const eventArg = handler.mock.calls[0]?.[0];
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId: 'test-discovery-id',
    });
  });

  it('should stop the event listeners and clear the ready timeout upon calling stop()', () => {
    // Spy on the stopEventListeners method
    // biome-ignore lint/suspicious/noExplicitAny: Used for testing
    const stopEventListenersSpy = vi.spyOn(discoveryListener as any, 'stopEventListeners');

    // Set a ready timeout
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Empty block used for testing
    discoveryListener['readyTimeout'] = setTimeout(() => {}, 1000);

    // Call the stop method
    discoveryListener.stop();

    // Verify the stopEventListeners method was called
    expect(stopEventListenersSpy).toHaveBeenCalled();

    // Verify the ready timeout was cleared
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['readyTimeout']).toBeNull();
  });

  it('should reset the state with new configurations upon calling reset()', () => {
    const newTechnologies = ['evm'];
    const newDiscoveryId = 'new-discovery-id';
    const newCallback = vi.fn();

    // Add a wallet to the state
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    discoveryListener['walletMap'].set('wallet-1', {
      name: 'Test Wallet 1',
      icon: 'icon1',
      rdns: 'com.wallet1',
    });

    // Call the reset function
    discoveryListener.reset(newTechnologies, newDiscoveryId, newCallback);

    // Verify the state has been reset

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['technologies']).toEqual(newTechnologies);
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['discoveryId']).toEqual(newDiscoveryId);
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['callback']).toEqual(newCallback);
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['walletMap'].size).toBe(0);
  });

  it('should reset the state with default values upon calling reset()', () => {
    // Add a wallet to the state
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    discoveryListener['walletMap'].set('wallet-1', {
      name: 'Test Wallet 1',
      icon: 'icon1',
      rdns: 'com.wallet1',
    });

    // Call the reset function without parameters
    discoveryListener.reset();

    // Verify the state has been reset with default values

    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['technologies']).toEqual([]);
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['discoveryId']).not.toEqual('test-discovery-id'); // Should be a new UUID
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['callback']).toBeNull();
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['walletMap'].size).toBe(0);
  });

  it('should debounce DiscoveryReadyEvents and dispatch DiscoveryRequestEvent', () => {
    vi.useFakeTimers();
    const dispatchDiscoveryRequestEventSpy = vi.spyOn(
      // biome-ignore lint/suspicious/noExplicitAny: Used for testing
      discoveryListener as any,
      'dispatchDiscoveryRequestEvent',
    );

    discoveryListener.start();

    // Dispatch the first ready event
    mockEventTarget.dispatchEvent(new Event(WmDiscovery.Ready));

    // Verify that the timeout is set
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['readyTimeout']).not.toBeNull();

    // Dispatch two more ready event before the debounce period ends
    mockEventTarget.dispatchEvent(new Event(WmDiscovery.Ready));
    mockEventTarget.dispatchEvent(new Event(WmDiscovery.Ready));

    // Fast-forward time to just before the debounce period ends
    vi.advanceTimersByTime(CONFIG.readyDebounceMs - 1);

    // Verify that the timeout is still set
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['readyTimeout']).not.toBeNull();

    // Fast-forward time to after the debounce period ends
    vi.advanceTimersByTime(1);

    // Verify that the timeout is cleared and the discovery request event is dispatched
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['readyTimeout']).toBeNull();
    expect(dispatchDiscoveryRequestEventSpy).toHaveBeenCalledTimes(2); // Once for start() and once for the debounce
  });

  it('should clear existing timeout when a new DiscoveryReadyEvent is received', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    discoveryListener.start();

    // Dispatch the first ready event
    mockEventTarget.dispatchEvent(new Event(WmDiscovery.Ready));

    // Verify that the timeout is set
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['readyTimeout']).not.toBeNull();

    // Dispatch two more ready events before the debounce period ends
    mockEventTarget.dispatchEvent(new Event(WmDiscovery.Ready));
    mockEventTarget.dispatchEvent(new Event(WmDiscovery.Ready));

    // Verify that clearTimeout was called to clear the existing timeout
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    clearTimeoutSpy.mockRestore();
  });

  it('should handle valid DiscoveryResponseEvent', () => {
    const mockAckHandler = vi.fn();
    mockEventTarget.addEventListener(WmDiscovery.Ack, mockAckHandler);

    const validResponseEvent = new CustomEvent<DiscoveryResponseEvent>(WmDiscovery.Response, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'test-discovery-id',
        wallet: {
          name: 'Test Wallet',
          icon: 'test-icon',
          rdns: 'com.test.wallet',
        },
        walletId: 'wallet-123',
      },
    });

    discoveryListener.start();

    // Dispatch the event
    mockEventTarget.dispatchEvent(validResponseEvent);

    // Verify the wallet was added to the walletMap
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['walletMap'].get('wallet-123')).toEqual({
      name: 'Test Wallet',
      icon: 'test-icon',
      rdns: 'com.test.wallet',
    });

    // Verify the callback was called with the wallet
    expect(mockCallback).toHaveBeenCalledWith({
      name: 'Test Wallet',
      icon: 'test-icon',
      rdns: 'com.test.wallet',
    });

    // Verify the ack handler was called
    expect(mockAckHandler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = mockAckHandler.mock.calls[0]?.[0] as CustomEvent<DiscoveryAckEvent>;

    // Verify the event using the guard
    expect(isDiscoveryAckEvent(eventArg.detail)).toBe(true);

    // Verify the ack event
    expect(eventArg.detail).toEqual({
      version: WM_PROTOCOL_VERSION,
      discoveryId: 'test-discovery-id',
      walletId: 'wallet-123',
    });
  });

  it('should return early for invalid DiscoveryResponseEvent', () => {
    const invalidResponseEvent = new CustomEvent(WmDiscovery.Response, {
      detail: {
        version: 'invalid-version',
        discoveryId: 'test-discovery-id',
        wallet: {},
        walletId: 'wallet-123',
      },
    });

    // Spy on the event handler
    // biome-ignore lint/suspicious/noExplicitAny: Used for testing
    const handler = vi.spyOn(discoveryListener as any, 'handleDiscoveryResponseEvent');

    discoveryListener.start();

    // Dispatch the event
    mockEventTarget.dispatchEvent(invalidResponseEvent);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0] as CustomEvent<DiscoveryResponseEvent>;

    // Verify the event using the guard
    expect(isDiscoveryResponseEvent(eventArg.detail)).toBe(false);

    // Verify the wallet was not added to the walletMap
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['walletMap'].has('wallet-123')).toBe(false);

    // Verify the callback was not called
    expect(mockCallback).not.toHaveBeenCalled();

    handler.mockRestore();
  });

  it('should return early for mismatched discoveryId', () => {
    const mismatchedDiscoveryIdEvent = new CustomEvent<DiscoveryResponseEvent>(WmDiscovery.Response, {
      detail: {
        version: WM_PROTOCOL_VERSION,
        discoveryId: 'mismatched-id',
        wallet: {
          name: 'Test Wallet',
          icon: 'test-icon',
          rdns: 'com.test.wallet',
        },
        walletId: 'wallet-123',
      },
    });

    // Spy on the event handler
    // biome-ignore lint/suspicious/noExplicitAny: Used for testing
    const handler = vi.spyOn(discoveryListener as any, 'handleDiscoveryResponseEvent');

    discoveryListener.start();

    // Dispatch the event
    mockEventTarget.dispatchEvent(mismatchedDiscoveryIdEvent);

    // Verify the handler was called
    expect(handler).toHaveBeenCalled();

    // Access the call arguments
    const eventArg = handler.mock.calls[0]?.[0] as CustomEvent<DiscoveryResponseEvent>;

    // Verify the discoveryId
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(eventArg.detail.discoveryId).not.toEqual(discoveryListener['discoveryId']);

    // Verify the wallet was not added to the walletMap
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    expect(discoveryListener['walletMap'].has('wallet-123')).toBe(false);

    // Verify the callback was not called
    expect(mockCallback).not.toHaveBeenCalled();

    handler.mockRestore();
  });

  it('should return the list of wallets', () => {
    const wallet1: WalletInfo = {
      name: 'Test Wallet 1',
      icon: 'icon1',
      rdns: 'com.wallet1',
    };

    const wallet2: WalletInfo = {
      name: 'Test Wallet 2',
      icon: 'icon2',
      rdns: 'com.wallet2',
    };

    // Add wallets to the internal map
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    discoveryListener['walletMap'].set('wallet-1', wallet1);
    // biome-ignore lint/complexity/useLiteralKeys: Access private state for testing
    discoveryListener['walletMap'].set('wallet-2', wallet2);

    // Verify the wallets property returns the correct list of wallets
    expect(discoveryListener.wallets).toEqual([wallet1, wallet2]);
  });

  it('should return an empty list if there are no wallets', () => {
    // Verify the wallets property returns an empty list
    expect(discoveryListener.wallets).toEqual([]);
  });
});
