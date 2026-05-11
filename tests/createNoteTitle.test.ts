import assert from "node:assert/strict";
import { removeDuplicateLeadingTitle } from "../src/views/createNoteContent";

assert.equal(removeDuplicateLeadingTitle("Plan Contex", "# Plan Contex\n\nBody"), "Body");
assert.equal(removeDuplicateLeadingTitle("Plan Contex", "Body"), "Body");

console.log("createNoteTitle tests passed");
