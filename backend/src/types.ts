export interface ISession {
  id: string;
  participants: string[];
  createdAt: string;
}

export interface IBubble {
  id: string;
  userId: string;
  username: string;
  text: string;
  isActive: boolean;
  timestamp: string;
}

export interface ILiveTypingEvent {
  type: 'live-typing';
  bubbleId: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface IBubbleClaimEvent {
  type: 'bubble-claim';
  bubbleId: string;
  userId: string;
  username: string;
  timestamp: string;
}

export interface IBubbleFinalizeEvent {
  type: 'bubble-finalize';
  bubbleId: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface ISessionJoinEvent {
  type: 'session-join';
  sessionId: string;
  userId: string;
  username: string;
}

export type P2PEvent = ILiveTypingEvent | IBubbleClaimEvent | IBubbleFinalizeEvent | ISessionJoinEvent;