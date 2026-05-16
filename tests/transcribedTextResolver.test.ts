import assert from "node:assert/strict";

import { getBestTranscribedText } from "../src/voice/transcribedTextResolver";

{
  const result = getBestTranscribedText({
    finalTranscription: "открой тест",
    liveTranscriptBaseText: "",
    liveTranscriptLastPreview: "",
    includeLiveBase: true
  });

  assert.equal(result, "открой тест");
}

{
  const result = getBestTranscribedText({
    finalTranscription: "",
    liveTranscriptBaseText: "привет",
    liveTranscriptLastPreview: "привет открой тест",
    includeLiveBase: false
  });

  assert.equal(result, "открой тест");
}

{
  const result = getBestTranscribedText({
    finalTranscription: "открой файл",
    liveTranscriptBaseText: "пожалуйста",
    liveTranscriptLastPreview: "пожалуйста открой фил",
    includeLiveBase: true
  });

  assert.equal(result, "пожалуйста открой файл");
}

{
  const result = getBestTranscribedText({
    finalTranscription: "открой файл",
    liveTranscriptBaseText: "пожалуйста",
    liveTranscriptLastPreview: "пожалуйста открой файл",
    includeLiveBase: false
  });

  assert.equal(result, "открой файл");
}

{
  const result = getBestTranscribedText({
    finalTranscription: "привет открой файл",
    liveTranscriptBaseText: "привет",
    liveTranscriptLastPreview: "привет открой файл",
    includeLiveBase: true
  });

  assert.equal(result, "привет открой файл");
}

console.log("transcribedTextResolver tests passed");
