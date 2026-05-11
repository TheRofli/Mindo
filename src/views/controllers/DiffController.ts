import type { SelectedTextContext } from "../../types";

export class DiffController {
  hasUsableSelection(
    selection: SelectedTextContext | null
  ): selection is SelectedTextContext {
    return Boolean(selection?.text.trim());
  }
}
