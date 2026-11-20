import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from "@angular/router";
import { EMPTY } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeVqaReportData,
  type ReportRecord,
} from "../../core/models/report.model";
import { Reports } from "../../core/services/reports";
import { VqaEditor } from "./vqa-editor";

describe("VqaEditor", () => {
  let fixture: ComponentFixture<VqaEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VqaEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ reportId: "report-id" }),
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(VqaEditor);
  });

  afterEach(() => fixture.destroy());

  it("loads the report ID from the reportId route parameter", () => {
    const getReport = vi
      .spyOn(TestBed.inject(Reports), "get")
      .mockReturnValue(EMPTY);

    fixture.detectChanges();

    expect(getReport).toHaveBeenCalledWith("report-id");
  });

  it("creates, duplicates, and resizes tables with editable column types", () => {
    const component = fixture.componentInstance;
    const report: ReportRecord = {
      id: "report-id",
      templateId: "vqa",
      templateVersion: 1,
      title: "Test VQA",
      status: "draft",
      data: {
        metadata: {
          projectOrSite: "Site",
          assessmentDate: "2026-11-19",
          assessor: "Architect",
          summary: "",
        },
        elements: [],
      },
      completedAt: null,
      createdAt: "2026-11-19T00:00:00.000Z",
      updatedAt: "2026-11-19T00:00:00.000Z",
      attachments: [],
    };
    component.report.set(report);

    component.createTable();
    let table = component
      .report()
      ?.data.elements.find((element) => element.type === "table");
    if (!table || table.type !== "table")
      throw new Error("Expected the new table to exist.");
    expect(table?.columns).toHaveLength(2);
    expect(table?.rows).toHaveLength(1);
    expect(Object.keys(table?.rows[0].cells ?? {})).toHaveLength(2);
    component.updateTableTitle(table.id, "Checklist");
    component.updateColumn(table.id, table.columns[0].id, {
      title: "Requirement",
    });
    component.updateColumnType(table.id, table.columns[1].id, "yesNo");
    component.addColumn(table.id);
    component.addRow(table.id);

    table = component
      .report()
      ?.data.elements.find((element) => element.type === "table");
    if (!table || table.type !== "table")
      throw new Error("Expected the table to remain.");
    expect(table?.title).toBe("Checklist");
    expect(table?.columns.map(({ title, type }) => ({ title, type }))).toEqual([
      { title: "Requirement", type: "text" },
      { title: "Column 2", type: "yesNo" },
      { title: "Column 3", type: "text" },
    ]);
    expect(table?.rows).toHaveLength(2);

    component.duplicateTable(table!.id);
    const duplicated = component
      .report()
      ?.data.elements.find(
        (element) => element.type === "table" && element.id !== table!.id,
      );
    if (!duplicated || duplicated.type !== "table")
      throw new Error("Expected the duplicated table.");
    expect(duplicated?.title).toBe("Checklist copy");
    expect(duplicated?.columns.map((column) => column.type)).toEqual([
      "text",
      "yesNo",
      "text",
    ]);
    expect(duplicated?.rows).toHaveLength(2);
    expect(duplicated?.rows[0].id).not.toBe(table?.rows[0].id);

    component.removeColumn(table!.id, table!.columns[2].id);
    component.removeRow(table!.id, table!.rows[1].id);
    const resized = component
      .report()
      ?.data.elements.find(
        (element) => element.type === "table" && element.id === table!.id,
      );
    if (!resized || resized.type !== "table")
      throw new Error("Expected the resized table.");
    expect(resized?.columns).toHaveLength(2);
    expect(resized?.rows).toHaveLength(1);
    expect(Object.keys(resized?.rows[0].cells ?? {})).toHaveLength(2);
  });

  it("converts existing checklist and vision data into editable tables", () => {
    const normalized = normalizeVqaReportData({
      metadata: {
        projectOrSite: "Site",
        assessmentDate: "2026-11-19",
        assessor: "Architect",
        summary: "",
      },
      ratingScale: { min: 1, max: 5 },
      checklistRows: [
        { id: "check-row", requirement: "Access", done: true, comments: "OK" },
      ],
      visionRows: [
        { id: "vision-row", aspect: "Daylight", rating: 4, comments: "Good" },
      ],
    });

    const tables = normalized.elements.filter(
      (element) => element.type === "table",
    );
    expect(tables).toHaveLength(2);
    expect(tables[0].rows[0]).toMatchObject({
      id: "check-row",
      cells: {
        [tables[0].columns[0].id]: "Access",
        [tables[0].columns[1].id]: true,
        [tables[0].columns[2].id]: "OK",
      },
    });
    expect(tables[1].rows[0].id).toBe("vision-row");
    expect(tables[1].columns[1]).toMatchObject({
      type: "rating",
      min: 1,
      max: 5,
    });
  });

  it("adds paragraphs, tables, and images in sequence and supports reordering", () => {
    const component = fixture.componentInstance;
    component.report.set({
      id: "report-id",
      templateId: "vqa",
      templateVersion: 3,
      title: "Test VQA",
      status: "draft",
      data: {
        metadata: {
          projectOrSite: "Site",
          assessmentDate: "2026-11-19",
          assessor: "Architect",
          summary: "",
        },
        elements: [],
      },
      completedAt: null,
      createdAt: "2026-11-19T00:00:00.000Z",
      updatedAt: "2026-11-19T00:00:00.000Z",
      attachments: [],
    });

    component.createParagraph();
    component.createTable();
    component.createImage();

    let elements = component.report()?.data.elements;
    expect(elements?.map((element) => element.type)).toEqual([
      "paragraph",
      "table",
      "image",
    ]);
    expect(elements?.[0]).toMatchObject({ type: "paragraph", text: "" });
    expect(elements?.[2]).toMatchObject({ type: "image", caption: "" });

    component.moveElement(elements![2].id, -1);
    elements = component.report()?.data.elements;
    expect(elements?.map((element) => element.type)).toEqual([
      "paragraph",
      "image",
      "table",
    ]);

    component.updateParagraph(elements![0].id, "Assessment overview");
    component.updateImageCaption(elements![1].id, "North elevation");
    expect(component.report()?.data.elements[0]).toMatchObject({
      text: "Assessment overview",
    });
    expect(component.report()?.data.elements[1]).toMatchObject({
      caption: "North elevation",
    });
  });
});
