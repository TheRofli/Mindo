import assert from "node:assert/strict";
import { BrowserSpeechController } from "../src/views/controllers/BrowserSpeechController";

interface FakeUtterance {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function createHarness(options: { hasSynthesis?: boolean } = {}) {
  const calls: string[] = [];
  const utterances: FakeUtterance[] = [];
  const synthesis =
    options.hasSynthesis === false
      ? null
      : {
          speak: (utterance: SpeechSynthesisUtterance) => {
            calls.push(`speak:${(utterance as unknown as FakeUtterance).text}`);
          },
          cancel: () => calls.push("cancel")
        };

  const controller = new BrowserSpeechController({
    getSpeechSynthesis: () => synthesis,
    createUtterance: (text) => {
      const utterance: FakeUtterance = {
        text,
        lang: "",
        voice: null,
        onend: null,
        onerror: null
      };
      utterances.push(utterance);
      return utterance as unknown as SpeechSynthesisUtterance;
    },
    guessLanguage: () => "ru-RU",
    findVoice: () => null,
    onFinished: (messageId) => calls.push(`finished:${messageId}`)
  });

  return { calls, controller, utterances };
}

async function run() {
  {
    const { calls, controller, utterances } = createHarness();

    controller.speak("Привет", "message-1");

    assert.equal(utterances.length, 1);
    assert.equal(utterances[0].lang, "ru-RU");
    assert.deepEqual(calls, ["speak:Привет"]);
  }

  {
    const { calls, controller, utterances } = createHarness();

    controller.speak("Привет", "message-2");
    utterances[0].onend?.();

    assert.deepEqual(calls, ["speak:Привет", "finished:message-2"]);
  }

  {
    const { calls, controller, utterances } = createHarness();

    controller.speak("Привет", "message-3");
    utterances[0].onerror?.();

    assert.deepEqual(calls, ["speak:Привет", "finished:message-3"]);
  }

  {
    const { calls, controller } = createHarness();

    controller.speak("Привет", "message-4");
    controller.stop();

    assert.deepEqual(calls, ["speak:Привет", "cancel"]);
  }

  {
    const { controller } = createHarness({ hasSynthesis: false });

    assert.throws(
      () => controller.speak("Привет", "message-5"),
      /Browser speech synthesis is not available/
    );
  }
}

void run()
  .then(() => {
    console.log("browserSpeechController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
