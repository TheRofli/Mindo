export class VoiceController {
  formatElapsedTime(startedAt: number, now = Date.now()): string {
    if (!startedAt) {
      return "0:00";
    }

    const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}
