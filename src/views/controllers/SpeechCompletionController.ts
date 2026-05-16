export class SpeechCompletionController {
  private resolvers = new Map<string, (completed: boolean) => void>();

  waitFor(messageId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvers.set(messageId, resolve);
    });
  }

  resolve(messageId: string, completed: boolean): void {
    const resolver = this.resolvers.get(messageId);

    if (!resolver) {
      return;
    }

    this.resolvers.delete(messageId);
    resolver(completed);
  }

  pendingCount(): number {
    return this.resolvers.size;
  }
}
