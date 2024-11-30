import type {
  DiscoveryRequestEvent,
  DiscoveryResponseEvent,
  DiscoveryAckEvent,
  WalletInfo,
} from './types.js';
import { isWalletInfo, isDiscoveryRequestEvent, isDiscoveryAckEvent } from './guards.js';
import { WM_PROTOCOL_VERSION, WmDiscovery } from './constants.js';

/**
 * Options for initializing a DiscoveryAnnouncer.
 *
 * @interface DiscoveryAnnouncerOptions
 * @property {WalletInfo} walletInfo - The wallet information to announce.
 * @property {string} [sessionId] - An optional session ID for the discovery process.
 * @property {EventTarget} [eventTarget] - An optional event target for dispatching and listening to events. Defaults to the global window object.
 * @property {string[]} [supportedTechnologies] - An optional array of supported technologies.
 */
export interface DiscoveryAnnouncerOptions {
  walletInfo: WalletInfo;
  sessionId?: string;
  eventTarget?: EventTarget;
  supportedTechnologies?: string[];
}

/**
 * Class representing a DiscoveryAnnouncer.
 *
 * The DiscoveryAnnouncer announces wallet information, listens for discovery requests,
 * and acknowledges discovery events.
 *
 * @class
 */
export class DiscoveryAnnouncer {
  private walletInfo: WalletInfo;
  private sessionId: string;
  private acknowledgedDiscoveryIds = new Set<string>();
  private pendingDiscoveryIds = new Set<string>();
  private supportedTechnologies: string[];
  private eventTarget: EventTarget;

  /**
   * Creates an instance of the announcer.
   *
   * @param {DiscoveryAnnouncerOptions} options - The options to initialize the DiscoveryAnnouncer.
   */
  constructor({ walletInfo, sessionId, supportedTechnologies, eventTarget }: DiscoveryAnnouncerOptions) {
    if (!isWalletInfo(walletInfo)) {
      throw new Error('Invalid walletInfo: ${walletInfo}');
    }
    this.walletInfo = walletInfo;
    this.sessionId = sessionId ?? crypto.randomUUID();
    this.supportedTechnologies = supportedTechnologies ?? [];
    this.eventTarget = eventTarget ?? window;
  }

  /**
   * Starts the DiscoveryAnnouncer by initializing event listeners and dispatching the initial "Ready" event.
   *
   * This method performs the following actions:
   * 1. Initializes the event listeners required for handling discovery events.
   * 2. Dispatches the initial "Ready" event to signal that the announcer is ready.
   *
   * @returns {void}
   */
  start = (): void => {
    this.startEventListeners();
    this.eventTarget.dispatchEvent(new CustomEvent(WmDiscovery.Ready));
  };

  /**
   * Stops the DiscoveryAnnouncer by removing event listeners and clearing internal state.
   *
   * This method performs the following actions:
   * 1. Removes the event listeners to stop handling discovery events.
   * 2. Clears the set of acknowledged discovery IDs.
   * 3. Clears the set of pending discovery IDs.
   *
   * @returns {void}
   */
  stop = (): void => {
    this.stopEventListeners();
    this.acknowledgedDiscoveryIds.clear();
    this.pendingDiscoveryIds.clear();
  };

  /**
   * Initializes and starts the event listeners for handling discovery events.
   *
   * This method performs the following actions:
   * 1. Adds an event listener for the 'Request' event to handle announce requests.
   * 2. Adds an event listener for the 'Ack' event to handle discovery acknowledgments.
   *
   * @returns {void}
   * @private
   */
  private startEventListeners = (): void => {
    this.eventTarget.addEventListener(WmDiscovery.Request, this.handleAnnounceRequestEvent as EventListener);
    this.eventTarget.addEventListener(WmDiscovery.Ack, this.handleDiscoveryAckEvent as EventListener);
  };

  /**
   * Stops the event listeners for handling discovery events.
   *
   * This method performs the following actions:
   * 1. Removes the event listener for the 'Request' event to stop handling announce requests.
   * 2. Removes the event listener for the 'Ack' event to stop handling discovery acknowledgments.
   *
   * @returns {void}
   * @private
   */
  private stopEventListeners = () => {
    this.eventTarget.removeEventListener(
      WmDiscovery.Request,
      this.handleAnnounceRequestEvent as EventListener,
    );
    this.eventTarget.removeEventListener(WmDiscovery.Ack, this.handleDiscoveryAckEvent as EventListener);
  };

  /**
   * Handles the 'Request' event for announce requests.
   *
   * This method performs the following actions:
   * 1. Validates the announce request event.
   * 2. Checks if the requested technologies match the supported technologies.
   * 3. Dispatches an announce response event with the wallet information if the technologies match.
   *
   * @param {CustomEvent<DiscoveryRequestEvent>} event - The announce request event to handle.
   *
   * @returns {void}
   * @private
   */
  private handleAnnounceRequestEvent = (event: CustomEvent<DiscoveryRequestEvent>): void => {
    const response = event.detail;
    if (!isDiscoveryRequestEvent(response)) {
      return;
    }

    const { discoveryId, technologies } = response;

    if (this.acknowledgedDiscoveryIds.has(discoveryId)) {
      return;
    }

    const matchingTechnologies = (technologies ?? []).filter((technology: string) =>
      this.supportedTechnologies.some((supported) => supported.toLowerCase() === technology.toLowerCase()),
    );

    if (technologies && technologies.length > 0 && matchingTechnologies.length === 0) {
      return;
    }
    this.pendingDiscoveryIds.add(discoveryId);

    this.dispatchDiscoveryResponseEvent(discoveryId, matchingTechnologies);
  };

  /**
   * Handles the 'Ack' event for discovery acknowledgments.
   *
   * This method performs the following actions:
   * 1. Validates the discovery acknowledgment event.
   * 2. Checks if the acknowledgment is for the current session and adds a pending discovery ID.
   * 3. Adds the discovery ID to the acknowledged set and removes it from the pending set if valid.
   *
   * @param {CustomEvent<DiscoveryAckEvent>} event - The discovery acknowledgment event to handle.
   *
   * @returns {void}
   * @private
   */
  private handleDiscoveryAckEvent = (event: CustomEvent<DiscoveryAckEvent>): void => {
    const response = event.detail;
    if (!isDiscoveryAckEvent(response)) {
      return;
    }
    const { walletId, discoveryId } = response;

    if (this.sessionId === walletId && this.pendingDiscoveryIds.has(discoveryId)) {
      this.acknowledgedDiscoveryIds.add(discoveryId);
      this.pendingDiscoveryIds.delete(discoveryId);
    }
  };

  /**
   * Dispatches a `DiscoveryResponseEvent` to the event target.
   *
   * This method creates and dispatches a custom event of type `WmDiscovery.Response`
   * with the details of the discovery response, including the protocol version,
   * discovery ID, wallet information, and matching technologies.
   *
   * @param {string} discoveryId - The discovery ID for the response.
   * @param {string[]} technologies - The array of matching technologies.
   *
   * @returns {void}
   * @private
   */
  private dispatchDiscoveryResponseEvent(discoveryId: string, technologies: string[]): void {
    // Explicitly select only the required fields
    /*   const { name, icon, rdns, extensionId, code, url } = this.walletInfo;

    let wallet: WalletInfo;

    if (url) {
      wallet = {
        name,
        icon,
        rdns,
        url,
        ...(technologies.length > 0 && { technologies }),
      } as WalletInfo;
    } else {
      wallet = {
        name,
        icon,
        rdns,
        ...(extensionId && { extensionId }),
        ...(code && { code }),
        ...(technologies.length > 0 && { technologies }),
      } as WalletInfo; */

    //console.log('wallet', wallet);

    const wallet = this.walletInfo;
    if (technologies.length > 0) {
      wallet.technologies = technologies;
    }

    this.eventTarget.dispatchEvent(
      new CustomEvent<DiscoveryResponseEvent>(WmDiscovery.Response, {
        detail: {
          discoveryId,
          version: WM_PROTOCOL_VERSION,
          walletId: this.sessionId,
          wallet,
        },
      }),
    );
  }
}
