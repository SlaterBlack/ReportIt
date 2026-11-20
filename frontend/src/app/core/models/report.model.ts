export type ReportStatus = "draft" | "completed";

export interface ReportAttachment {
  id: string;
  entryId: string;
  caption: string;
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export type VqaColumnType = "text" | "number" | "date" | "yesNo" | "rating";
export type VqaCellValue = string | number | boolean | null;

export interface VqaTableColumn {
  id: string;
  title: string;
  type: VqaColumnType;
  min?: number;
  max?: number;
}

export interface VqaTableRow {
  id: string;
  cells: Record<string, VqaCellValue>;
}

export interface VqaTable {
  id: string;
  type: "table";
  title: string;
  columns: VqaTableColumn[];
  rows: VqaTableRow[];
}

export interface VqaParagraphElement {
  id: string;
  type: "paragraph";
  text: string;
}

export interface VqaImageElement {
  id: string;
  type: "image";
  caption: string;
}

export type VqaContentElement =
  VqaParagraphElement | VqaTable | VqaImageElement;

export interface VqaReportData {
  metadata: {
    projectOrSite: string;
    assessmentDate: string;
    assessor: string;
    summary: string;
  };
  elements: VqaContentElement[];
}

export interface LegacyVqaReportData {
  metadata: VqaReportData["metadata"];
  ratingScale: {
    min: number;
    max: number;
  };
  checklistRows: Array<{
    id: string;
    requirement: string;
    done: boolean | null;
    comments: string;
  }>;
  visionRows: Array<{
    id: string;
    aspect: string;
    rating: number | null;
    comments: string;
  }>;
}

export interface TableOnlyVqaReportData {
  metadata: VqaReportData["metadata"];
  tables: Array<Omit<VqaTable, "type">>;
}

export function normalizeVqaReportData(value: unknown): VqaReportData {
  if (typeof value !== "object" || value === null) {
    throw new Error("Report data is invalid.");
  }
  if ("elements" in value) {
    return value as VqaReportData;
  }

  if ("tables" in value && Array.isArray(value.tables)) {
    const tableData = value as TableOnlyVqaReportData;
    return {
      metadata: tableData.metadata,
      elements: tableData.tables.map((table) => ({ ...table, type: "table" })),
    };
  }

  const legacy = value as LegacyVqaReportData;
  const elements: VqaContentElement[] = [];
  if (legacy.checklistRows?.length) {
    const requirementId = crypto.randomUUID();
    const doneId = crypto.randomUUID();
    const commentsId = crypto.randomUUID();
    elements.push({
      id: crypto.randomUUID(),
      type: "table",
      title: "Completion checklist",
      columns: [
        { id: requirementId, title: "Requirement", type: "text" },
        { id: doneId, title: "Done?", type: "yesNo" },
        { id: commentsId, title: "Comments", type: "text" },
      ],
      rows: legacy.checklistRows.map((row) => ({
        id: row.id,
        cells: {
          [requirementId]: row.requirement,
          [doneId]: row.done,
          [commentsId]: row.comments,
        },
      })),
    });
  }
  if (legacy.visionRows?.length) {
    const aspectId = crypto.randomUUID();
    const ratingId = crypto.randomUUID();
    const commentsId = crypto.randomUUID();
    elements.push({
      id: crypto.randomUUID(),
      type: "table",
      title: "Design vision match",
      columns: [
        { id: aspectId, title: "Design aspect", type: "text" },
        {
          id: ratingId,
          title: "Vision match",
          type: "rating",
          min: legacy.ratingScale.min,
          max: legacy.ratingScale.max,
        },
        { id: commentsId, title: "Comments", type: "text" },
      ],
      rows: legacy.visionRows.map((row) => ({
        id: row.id,
        cells: {
          [aspectId]: row.aspect,
          [ratingId]: row.rating,
          [commentsId]: row.comments,
        },
      })),
    });
  }
  return { metadata: legacy.metadata, elements };
}

export interface ReportRecord {
  id: string;
  templateId: "vqa";
  templateVersion: number;
  title: string;
  status: ReportStatus;
  data: VqaReportData;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: ReportAttachment[];
}
