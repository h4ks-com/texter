export interface ISession {
  id: string;
  participants: string[];
  createdAt: string;
}

export interface IBubble {
  id: string;
  ownerId: string; // User ID who owns this bubble
  ownerName: string; // Username who owns this bubble
  text: string;
  isFinalized: boolean; // Whether user pressed Enter to finish
  claimedAt: string; // When bubble was claimed
  finalizedAt?: string; // When bubble was finalized
}

export interface IBubbleClaimEvent {
  type: 'bubble-claim';
  bubbleId: string;
  ownerId: string;
  ownerName: string;
  claimedAt: string;
}

export interface IBubbleUpdateEvent {
  type: 'bubble-update';
  bubbleId: string;
  text: string;
  timestamp: string;
}

export interface IBubbleFinalizeEvent {
  type: 'bubble-finalize';
  bubbleId: string;
  finalizedAt: string;
}

export interface IBubbleSyncEvent {
  type: 'bubble-sync';
  bubbles: IBubble[];
}

export interface IPeerRequestSyncEvent {
  type: 'request-sync';
  requesterId: string;
}

export type P2PEvent =
  | IBubbleClaimEvent
  | IBubbleUpdateEvent
  | IBubbleFinalizeEvent
  | IBubbleSyncEvent
  | IPeerRequestSyncEvent;
