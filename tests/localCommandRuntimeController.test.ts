import assert from "node:assert/strict";
import { LocalCommandRuntimeController } from "../src/views/controllers/LocalCommandRuntimeController";
import type { LocalCommandAction } from "../src/views/sidebarTypes";

const openAction: LocalCommandAction = {
  kind: "open-file",
  query: "Test/Test.md",
  commandText: "Открой тест"
};

{
  const calls: string[] = [];
  const controller = new LocalCommandRuntimeController({
    resolveLocalCommandAction: async () => null,
    executeLocalCommandAction: async () => calls.push("execute"),
    getMessageCount: () => 0,
    getErrorMessage: () => "",
    isLiveDialogueSessionActive: () => false,
    playLiveDialogueAcknowledgement: async () => calls.push("ack"),
    appendActionReceipt: (receipt, commandText) => {
      calls.push(`${receipt.status}:${receipt.label}:${commandText}`);
    },
    setStatus: (status) => calls.push(status),
    shouldPreventChatFallback: (text) => /открой/i.test(text),
    normalizeCommandText: (text) => text,
    getEffectiveCommandText: (text) => text
  });

  assert.equal(await controller.handle("   "), false);
  assert.equal(await controller.handle("Привет"), false);
  assert.deepEqual(calls, []);
}

{
  const calls: string[] = [];
  const controller = new LocalCommandRuntimeController({
    resolveLocalCommandAction: async () => null,
    executeLocalCommandAction: async () => calls.push("execute"),
    getMessageCount: () => 0,
    getErrorMessage: () => "",
    isLiveDialogueSessionActive: () => false,
    playLiveDialogueAcknowledgement: async () => calls.push("ack"),
    appendActionReceipt: (receipt, commandText) => {
      calls.push(`${receipt.status}:${receipt.label}:${commandText}`);
    },
    setStatus: (status) => calls.push(status),
    shouldPreventChatFallback: (text) => /открой/i.test(text),
    normalizeCommandText: (text) => text,
    getEffectiveCommandText: (text) => text
  });

  assert.equal(await controller.handle("Открой тест в папке тест"), true);
  assert.deepEqual(calls, [
    "failed:Action not resolved:Открой тест в папке тест",
    "Status: Action not resolved"
  ]);
}

{
  const calls: string[] = [];
  const controller = new LocalCommandRuntimeController({
    resolveLocalCommandAction: async () => openAction,
    executeLocalCommandAction: async () => calls.push("execute"),
    getMessageCount: () => 1,
    getErrorMessage: () => "",
    isLiveDialogueSessionActive: () => true,
    playLiveDialogueAcknowledgement: async (kind) => calls.push(`ack:${kind}`),
    appendActionReceipt: (receipt) => calls.push(`receipt:${receipt.status}`),
    setStatus: (status) => calls.push(status),
    shouldPreventChatFallback: (text) => /открой/i.test(text),
    normalizeCommandText: (text) => text,
    getEffectiveCommandText: (text) => text
  });

  assert.equal(await controller.handle("Открой тест"), true);
  assert.equal(calls[0]?.startsWith("ack:"), true);
  assert.deepEqual(calls.slice(1), ["execute"]);
}

{
  const calls: string[] = [];
  const controller = new LocalCommandRuntimeController({
    resolveLocalCommandAction: async () => openAction,
    executeLocalCommandAction: async () => calls.push("execute"),
    getMessageCount: () => 1,
    getErrorMessage: () => "Could not open file",
    isLiveDialogueSessionActive: () => false,
    playLiveDialogueAcknowledgement: async () => calls.push("ack"),
    appendActionReceipt: (receipt, commandText) =>
      calls.push(`${receipt.status}:${receipt.label}:${commandText}`),
    setStatus: (status) => calls.push(status),
    shouldPreventChatFallback: (text) => /открой/i.test(text),
    normalizeCommandText: (text) => text,
    getEffectiveCommandText: (text) => text
  });

  assert.equal(await controller.handle("Открой тест"), true);
  assert.deepEqual(calls, [
    "execute",
    "failed:Action failed:Открой тест"
  ]);
}

console.log("localCommandRuntimeController tests passed");
