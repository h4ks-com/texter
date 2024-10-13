export interface IMessageContent {
  text: string;
}

export interface IMessage {
  timestamp: string;
  user: string;
  content: IMessageContent;
}
