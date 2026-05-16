import { strict as assert } from "node:assert";

import { handleEarlyUserMessageWorkflow } from "../src/chat/userMessageEarlyWorkflow";

async function run() {
  {
    const calls: string[] = [];
    const handled = await handleEarlyUserMessageWorkflow({
      content: "answer",
      liveDialogue: false,
      hasOutgoingAttachments: true,
      handlePendingContexCodeInterviewAnswer: async () => {
        calls.push("interview");
        return true;
      },
      handleLocalCommandText: async () => {
        calls.push("local");
        return false;
      },
      clearAttachedContext: () => calls.push("clear-attachments"),
      continueLiveDialogueAfterLocalAction: async () => calls.push("continue-live"),
      isLoading: () => true,
      hasActiveGenerationAbortController: () => false,
      setLoading: (loading) => calls.push(`loading:${loading}`),
      clearPendingUserMessage: () => calls.push("clear-pending"),
      setSuppressActionReceiptUserContent: (value) =>
        calls.push(`suppress:${value}`)
    });

    assert.equal(handled, true);
    assert.deepEqual(calls, [
      "suppress:true",
      "interview",
      "clear-attachments",
      "loading:false",
      "clear-pending",
      "suppress:false"
    ]);
  }

  {
    const calls: string[] = [];
    const handled = await handleEarlyUserMessageWorkflow({
      content: "open note",
      liveDialogue: true,
      hasOutgoingAttachments: false,
      handlePendingContexCodeInterviewAnswer: async () => {
        calls.push("interview");
        return false;
      },
      handleLocalCommandText: async () => {
        calls.push("local");
        return true;
      },
      clearAttachedContext: () => calls.push("clear-attachments"),
      continueLiveDialogueAfterLocalAction: async () => calls.push("continue-live"),
      isLoading: () => true,
      hasActiveGenerationAbortController: () => true,
      setLoading: (loading) => calls.push(`loading:${loading}`),
      clearPendingUserMessage: () => calls.push("clear-pending"),
      setSuppressActionReceiptUserContent: (value) =>
        calls.push(`suppress:${value}`)
    });

    assert.equal(handled, true);
    assert.deepEqual(calls, [
      "suppress:true",
      "interview",
      "local",
      "clear-pending",
      "continue-live",
      "suppress:false"
    ]);
  }

  {
    const calls: string[] = [];
    const handled = await handleEarlyUserMessageWorkflow({
      content: "open note",
      liveDialogue: true,
      hasOutgoingAttachments: false,
      handlePendingContexCodeInterviewAnswer: async () => false,
      handleLocalCommandText: async () => {
        calls.push("local");
        return true;
      },
      clearAttachedContext: () => calls.push("clear-attachments"),
      continueLiveDialogueAfterLocalAction: async () => calls.push("continue-live"),
      isLoading: () => true,
      hasActiveGenerationAbortController: () => false,
      setLoading: (loading) => calls.push(`loading:${loading}`),
      clearPendingUserMessage: () => calls.push("clear-pending"),
      setSuppressActionReceiptUserContent: (value) =>
        calls.push(`suppress:${value}`)
    });

    assert.equal(handled, true);
    assert.deepEqual(calls, [
      "suppress:true",
      "local",
      "loading:false",
      "clear-pending",
      "continue-live",
      "suppress:false"
    ]);
  }

  {
    const calls: string[] = [];
    const handled = await handleEarlyUserMessageWorkflow({
      content: "normal chat",
      liveDialogue: false,
      hasOutgoingAttachments: true,
      handlePendingContexCodeInterviewAnswer: async () => false,
      handleLocalCommandText: async () => false,
      clearAttachedContext: () => calls.push("clear-attachments"),
      continueLiveDialogueAfterLocalAction: async () => calls.push("continue-live"),
      isLoading: () => true,
      hasActiveGenerationAbortController: () => false,
      setLoading: (loading) => calls.push(`loading:${loading}`),
      clearPendingUserMessage: () => calls.push("clear-pending"),
      setSuppressActionReceiptUserContent: (value) =>
        calls.push(`suppress:${value}`)
    });

    assert.equal(handled, false);
    assert.deepEqual(calls, ["suppress:true", "suppress:false"]);
  }
}

run()
  .then(() => {
    console.log("userMessageEarlyWorkflow tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
