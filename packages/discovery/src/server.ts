import type {
  WalletInfo,
  DiscoveryRequestEvent,
  DiscoveryResponseEvent,
  DiscoveryAckEvent,
} from './types.js';
import { isDiscoveryResponseEvent } from './guards.js';
import { WM_PROTOCOL_VERSION, WmDiscovery, CONFIG } from './constants.js';

/**
 * Options for initializing a DiscoveryListener.
 *
 * @interface DiscoveryListenerOptions
 * @property {string[]} [technologies] - An optional array of technologies to initialize.
 * @property {string} [discoveryId] - An optional discovery ID to set. If not provided, a new one will be generated.
 * @property {(wallet: WalletInfo) => void} [callback] - An optional callback function to handle wallet information.
 * @property {EventTarget} [eventTarget] - An optional event target for dispatching and listening to events. Defaults to the global window object.
 */
export interface DiscoveryListenerOptions {
  technologies?: string[];
  discoveryId?: string;
  callback?: (wallet: WalletInfo) => void;
  eventTarget?: EventTarget;
}

/**
 * Class representing a DiscoveryListener.
 *
 * The DiscoveryListener handles discovery events, manages wallet information,
 * and dispatches discovery requests and acknowledgment events.
 *
 * @class
 */
export class DiscoveryListener {
  private readyTimeout: ReturnType<typeof setTimeout> | null;
  private walletMap = new Map<string, WalletInfo>();
  private technologies: string[];
  private discoveryId: string;
  private callback: ((wallet: WalletInfo) => void) | null;
  private eventTarget: EventTarget;

  /**
   * Creates an instance of the server.
   *
   * @param {DiscoveryListenerOptions} options - The options to initialize the DiscoveryListener.
   */
  constructor({ technologies, discoveryId, callback, eventTarget }: DiscoveryListenerOptions) {
    this.technologies = technologies ?? [];
    this.discoveryId = discoveryId ?? crypto.randomUUID();
    this.callback = callback ?? null;
    this.eventTarget = eventTarget ?? window;
    this.readyTimeout = null;
  }

  /**
   * Gets the list of wallets.
   *
   * @returns {WalletInfo[]} The list of wallets.
   */
  get wallets(): WalletInfo[] {
    return Array.from(this.walletMap.values());
  }

  /**
   * Starts the server by initializing event listeners and dispatching the initial discovery request event.
   *
   * This method performs the following actions:
   * 1. Initializes the event listeners required for handling discovery events.
   * 2. Dispatches the initial discovery request event to start the discovery process.
   *
   * @returns {void}
   */
  start = (): void => {
    this.startEventListeners();
    this.dispatchDiscoveryRequestEvent();
  };

  /**
   * Stops the server by removing event listeners, clearing timeouts, and resetting the state.
   *
   * This method performs the following actions:
   * 1. Removes the event listeners to stop handling discovery events.
   * 2. Clears any active timeouts to prevent further actions.
   *
   * @returns {void}
   */
  stop = (): void => {
    this.stopEventListeners();

    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }
  };

  /**
   * Resets the server state with new configurations.
   *
   * This method performs the following actions:
   * 1. Updates the technologies if provided.
   * 2. Sets a new discovery ID or generates a new one if not provided.
   * 3. Updates the callback function if provided.
   * 4. Clears the current wallets state.
   *
   * @param {string[]} [technologies] - An optional array of technologies to update.
   * @param {string} [discoveryId] - An optional discovery ID to set. If not provided, a new one will be generated.
   * @param {(wallet: WalletInfo) => void} [callback] - An optional callback function to update.
   *
   * @returns {void}
   */
  reset = (technologies?: string[], discoveryId?: string, callback?: (wallet: WalletInfo) => void): void => {
    this.technologies = technologies ?? [];

    this.discoveryId = discoveryId ?? crypto.randomUUID();

    this.callback = callback ?? null;

    this.walletMap.clear();
  };

  /**
   * Initializes and starts the event listeners for handling discovery events.
   *
   * This method performs the following actions:
   * 1. Adds an event listener for the 'Ready' event to handle discovery readiness.
   * 2. Adds an event listener for the 'Response' event to handle discovery responses.
   *
   * @returns {void}
   * @private
   */
  private startEventListeners = () => {
    this.eventTarget.addEventListener(WmDiscovery.Ready, this.handleDiscoveryReadyEvent as EventListener);

    this.eventTarget.addEventListener(
      WmDiscovery.Response,
      this.handleDiscoveryResponseEvent as EventListener,
    );
  };

  /**
   * Stops the event listeners for handling discovery events.
   *
   * This method performs the following actions:
   * 1. Removes the event listener for the 'Ready' event to stop handling discovery readiness.
   * 2. Removes the event listener for the 'Response' event to stop handling discovery responses.
   *
   * @returns {void}
   * @private
   */
  private stopEventListeners = () => {
    this.eventTarget.removeEventListener(WmDiscovery.Ready, this.handleDiscoveryReadyEvent as EventListener);

    this.eventTarget.removeEventListener(
      WmDiscovery.Response,
      this.handleDiscoveryResponseEvent as EventListener,
    );
  };

  /**
   * Handles the 'Ready' event for discovery readiness.
   *
   * This method performs the following actions:
   * 1. Clears any existing ready timeout to debounce the ready event.
   * 2. Sets a new timeout to dispatch the discovery request event after a debounce period.
   *
   * @returns {void}
   * @private
   */
  private handleDiscoveryReadyEvent = (): void => {
    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
    }

    // Debounce the ready event to avoid responding to multiple requests
    this.readyTimeout = setTimeout(() => {
      this.readyTimeout = null;
      this.dispatchDiscoveryRequestEvent();
    }, CONFIG.readyDebounceMs);
  };

  /**
   * Handles the 'Response' event for discovery responses.
   *
   * This method performs the following actions:
   * 1. Validates the discovery response event.
   * 2. Validates the wallet information in the response.
   * 3. Checks if the discovery ID matches the current discovery ID.
   * 4. Updates the wallets map with the new wallet information.
   * 5. Calls the callback function with the new wallet information, if provided.
   * 6. Dispatches an acknowledgment event for the wallet.
   *
   * @param {CustomEvent<DiscoveryResponseEvent>} event - The discovery response event to handle.
   *
   * @returns {void}
   * @private
   */
  private handleDiscoveryResponseEvent = (event: CustomEvent<DiscoveryResponseEvent>) => {
    const response = event.detail;
    if (!isDiscoveryResponseEvent(response)) {
      return;
    }

    const { wallet, discoveryId, walletId } = response;

    if (discoveryId !== this.discoveryId) {
      return;
    }

    this.walletMap.set(walletId, wallet);
    if (this.callback) {
      this.callback(wallet);
    }

    this.dispatchDiscoveryAckEvent(walletId);
  };

  /**
   * Dispatches a `DiscoveryRequestEvent` to the event target.
   *
   * This method creates and dispatches a custom event of type `WmDiscovery.Request`
   * with the details of the discovery request, including the protocol version,
   * discovery ID, and supported technologies.
   *
   * @returns {void}
   * @private
   */
  private dispatchDiscoveryRequestEvent = (): void => {
    const detail: DiscoveryRequestEvent = {
      version: WM_PROTOCOL_VERSION,
      discoveryId: this.discoveryId,
    };

    if (this.technologies.length > 0) {
      detail.technologies = this.technologies;
    }

    this.eventTarget.dispatchEvent(new CustomEvent<DiscoveryRequestEvent>(WmDiscovery.Request, { detail }));
  };

  /**
   * Dispatches a `DiscoveryAckEvent` to the event target.
   *
   * This method creates and dispatches a custom event of type `WmDiscovery.Ack`
   * with the details of the acknowledgment, including the protocol version,
   * discovery ID, and wallet ID.
   *
   * @param {string} walletId - The ID of the wallet to acknowledge.
   *
   * @returns {void}
   * @private
   */
  private dispatchDiscoveryAckEvent = (walletId: string): void => {
    this.eventTarget.dispatchEvent(
      new CustomEvent<DiscoveryAckEvent>(WmDiscovery.Ack, {
        detail: {
          version: WM_PROTOCOL_VERSION,
          discoveryId: this.discoveryId,
          walletId: walletId,
        },
      }),
    );
  };
}
