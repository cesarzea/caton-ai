/** An email as the connector needs it, whatever mailbox it came from. */
export interface MailMessage {
  /** The `Message-ID` header: stable across syncs, so it identifies the movement. */
  readonly messageId: string;
  /** Address of the `From` header. */
  readonly from: string;
  readonly subject: string;
  /** When the message was sent (`Date` header). */
  readonly date: Date;
  /** `Authentication-Results` headers, topmost (most recently added) first. */
  readonly authenticationResults: readonly string[];
  readonly text: string | null;
  readonly html: string | null;
}
