import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Branding } from "../../core/services/branding";
import { Auth } from "../../core/services/auth";
import { Reports } from "../../core/services/reports";
import { Appearance } from "../../core/services/appearance";
import type { VqaReportData } from "../../core/models/report.model";

@Component({
  selector: "app-report-templates",
  templateUrl: "./report-templates.html",
  styleUrl: "./report-library.scss",
})
export class ReportTemplates {
  readonly branding = inject(Branding);
  readonly appearance = inject(Appearance);
  private readonly reports = inject(Reports);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  readonly isStarting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  startVqaReport(): void {
    if (this.isStarting()) return;
    this.isStarting.set(true);
    this.errorMessage.set(null);
    const today = new Date();
    const localDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    const data: VqaReportData = {
      metadata: {
        projectOrSite: "",
        assessmentDate: localDate,
        assessor: this.auth.currentUser()?.name ?? "",
        summary: "",
      },
      elements: [],
    };
    this.reports.create("VQA report", data).subscribe({
      next: ({ report }) => {
        void this.router.navigate(["/reports", report.id]);
      },
      error: (error: unknown) => {
        console.error("Could not start a VQA report.", error);
        this.errorMessage.set("Could not start the report. Please try again.");
        this.isStarting.set(false);
      },
    });
  }
}
