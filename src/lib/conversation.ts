/**
 * Conversation data model for the Chat view.
 *
 * Defines the types used to represent individual messages and full conversations
 * that are persisted to localStorage.
 */

/**
 * The role of the participant who authored a message.
 */
export type MessageRole = "user" | "assistant";

/**
 * A single message in a conversation.
 */
export interface Message {
  /** Unique identifier for the message. */
  id: string;
  /** Who sent the message. */
  role: MessageRole;
  /** The full text content of the message. */
  content: string;
  /** ISO 8601 timestamp of when the message was created. */
  timestamp: string;
}

/**
 * A conversation — a named sequence of messages with metadata.
 */
export interface Conversation {
  /** Unique identifier for the conversation. */
  id: string;
  /** Short human-readable title derived from the first user message. */
  title: string;
  /** Ordered list of messages in this conversation. */
  messages: Message[];
  /** ISO 8601 timestamp of when the conversation was first created. */
  createdAt: string;
  /** ISO 8601 timestamp of the most recent modification. */
  updatedAt: string;
}
