import { Modal } from "obsidian";
import type { App } from "obsidian";
import type { ContexDoctorReport } from "./contexDoctor";
import { buildOnboardingChecklist } from "./onboarding";

export class DoctorModal extends Modal {
  constructor(app: App, private readonly report: ContexDoctorReport) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("contex-doctor-modal");
    contentEl.createEl("h2", { text: "Mindo Doctor" });
    contentEl.createEl("p", { text: `Overall: ${this.report.overall}` });

    const list = contentEl.createEl("div", { cls: "contex-doctor-checks" });
    this.report.checks.forEach((check) => {
      const row = list.createEl("div", {
        cls: `contex-doctor-check contex-doctor-${check.severity}`
      });
      row.createEl("strong", { text: check.label });
      row.createEl("span", { text: check.message });
      if (check.detail) {
        row.createEl("code", { text: check.detail });
      }
    });

    const checklist = buildOnboardingChecklist(this.report);
    const onboardingEl = contentEl.createEl("div", {
      cls: "contex-onboarding-checklist"
    });
    onboardingEl.createEl("h3", { text: "Onboarding" });
    onboardingEl.createEl("p", {
      text: checklist.isReady
        ? "Core setup is ready."
        : "Finish these items to make Mindo reliable."
    });

    checklist.steps.forEach((step) => {
      const row = onboardingEl.createEl("div", {
        cls: [
          "contex-onboarding-step",
          `contex-onboarding-step--${step.status}`
        ]
      });
      row.createEl("span", {
        cls: "contex-onboarding-step__marker",
        text: step.status === "done" ? "✓" : step.advanced ? "·" : "○"
      });
      row.createEl("strong", {
        text: `${step.label}${step.advanced ? " (advanced)" : ""}`
      });
      row.createEl("span", { text: step.action });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
