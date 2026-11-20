import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VqaReportData } from "../models/report.model";
import { Reports } from "./reports";

describe("Reports", () => {
  let reports: Reports;
  let http: HttpTestingController;

  const data: VqaReportData = {
    metadata: {
      projectOrSite: "North House",
      assessmentDate: "2026-11-19",
      assessor: "Architect",
      summary: "",
    },
    elements: [
      {
        id: "table-id",
        type: "table",
        title: "Checklist",
        columns: [
          { id: "requirement-id", title: "Requirement", type: "text" },
          { id: "done-id", title: "Done?", type: "yesNo" },
        ],
        rows: [
          {
            id: "row-id",
            cells: {
              "requirement-id": "Check access",
              "done-id": true,
            },
          },
        ],
      },
    ],
  };
  const savedReport = {
    id: "report-id",
    templateId: "vqa" as const,
    templateVersion: 1,
    title: "North House VQA",
    status: "draft" as const,
    data,
    completedAt: null,
    createdAt: "2026-11-19T00:00:00.000Z",
    updatedAt: "2026-11-19T00:00:00.000Z",
    attachments: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    reports = TestBed.inject(Reports);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("creates a VQA report with the typed template data", () => {
    reports.create("North House VQA", data).subscribe();

    const request = http.expectOne("/api/reportit/reports");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({
      templateId: "vqa",
      title: "North House VQA",
      data,
    });
    request.flush({ report: savedReport });
  });

  it("saves report data and status", () => {
    reports.save("report-id", "North House VQA", "completed", data).subscribe();

    const request = http.expectOne("/api/reportit/reports/report-id");
    expect(request.request.method).toBe("PATCH");
    expect(request.request.body).toEqual({
      title: "North House VQA",
      status: "completed",
      data,
    });
    request.flush({ report: savedReport });
  });

  it("uploads a captioned image against a report entry", () => {
    const file = new File(["png"], "site.png", { type: "image/png" });
    reports
      .uploadImage("report-id", "entry-id", "North elevation", file)
      .subscribe();

    const request = http.expectOne(
      "/api/reportit/reports/report-id/attachments",
    );
    expect(request.request.method).toBe("POST");
    expect(request.request.body.get("entryId")).toBe("entry-id");
    expect(request.request.body.get("caption")).toBe("North elevation");
    expect(request.request.body.get("file")).toBe(file);
    request.flush({
      attachment: {
        id: "image-id",
        entryId: "entry-id",
        caption: "North elevation",
        fileName: "site.png",
        contentType: "image/png",
        sizeBytes: 3,
        url: "/api/reportit/reports/report-id/attachments/image-id",
        createdAt: "2026-11-19T00:00:00.000Z",
      },
    });
  });
});
