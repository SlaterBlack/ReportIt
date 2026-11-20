import { Component, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import type { ReportRecord } from "../../core/models/report.model";
import { Reports } from "../../core/services/reports";

@Component({
  selector: "app-my-reports",
  imports: [RouterLink],
  templateUrl: "./my-reports.html",
  styleUrl: "./report-library.scss",
})
export class MyReports implements OnInit {
  private readonly reportsApi = inject(Reports);
  readonly reports = signal<ReportRecord[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.reportsApi.list().subscribe({
      next: ({ reports }) => {
        this.reports.set(reports);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error("Could not load reports.", error);
        this.errorMessage.set("Could not load your reports. Please try again.");
        this.isLoading.set(false);
      },
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value),
    );
  }
}
