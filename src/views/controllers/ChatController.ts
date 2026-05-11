import type { ActionReceipt, ChatMessage, LlmFileAttachment } from "../../types";

export class ChatController {
  createUserMessage(
    content: string,
    index: number,
    attachments: LlmFileAttachment[] | null = null
  ): ChatMessage {
    return {
      id: `${Date.now()}-${index}`,
      role: "user",
      content,
      createdAt: Date.now(),
      attachments
    };
  }

  createActionReceiptMessages(
    receipt: ActionReceipt,
    index: number,
    userContent?: string,
    userAttachments?: LlmFileAttachment[] | null
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (userContent?.trim()) {
      messages.push(
        this.createUserMessage(userContent.trim(), index, userAttachments ?? null)
      );
    }

    messages.push({
      id: `${Date.now()}-${index + messages.length}`,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      actionReceipt: receipt
    });

    return messages;
  }
}
