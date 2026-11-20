import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject, OnDestroy, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import type {
  ReportAttachment,
  ReportRecord,
  VqaCellValue,
  VqaColumnType,
  VqaContentElement,
  VqaTable,
  VqaTableColumn,
} from "../../core/models/report.model";
import { normalizeVqaReportData } from "../../core/models/report.model";
import { Appearance } from "../../core/services/appearance";
import { Branding } from "../../core/services/branding";
import { Reports } from "../../core/services/reports";

@Component({
  selector: "app-vqa-editor",
  imports: [FormsModule, RouterLink],
  templateUrl: "./vqa-editor.html",
  styleUrl: "./vqa-editor.scss",
})
export class VqaEditor implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly reportsApi = inject(Reports);
  private readonly branding = inject(Branding);
  private readonly appearance = inject(Appearance);
  private readonly objectUrls = new Set<string>();

  readonly report = signal<ReportRecord | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isLoadingImages = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);
  readonly attachmentError = signal<string | null>(null);
  readonly captionDrafts = signal<Record<string, string>>({});
  readonly imagePreviews = signal<Record<string, string>>({});
  private previousDocumentTitle: string | null = null;
  private readonly afterPrint = () => {
    document.documentElement.classList.remove("report-printing");
    if (this.previousDocumentTitle !== null) {
      document.title = this.previousDocumentTitle;
      this.previousDocumentTitle = null;
    }
  };

  ngOnInit(): void {
    window.addEventListener("afterprint", this.afterPrint);
    const reportId = this.route.snapshot.paramMap.get("reportId");
    if (!reportId) {
      this.errorMessage.set("Report ID is missing.");
      this.isLoading.set(false);
      return;
    }
    this.loadReport(reportId);
  }

  ngOnDestroy(): void {
    window.removeEventListener("afterprint", this.afterPrint);
    this.afterPrint();
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
  }

  brandingName(): string {
    return this.branding.brand()?.companyName ?? "";
  }

  brandingLogo(): string | null {
    return this.branding.logoFor(this.appearance.theme());
  }

  printBrandingLogo(): string | null {
    return this.branding.logoFor("default");
  }

  loadReport(reportId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.reportsApi.get(reportId).subscribe({
      next: ({ report }) => {
        let normalizedReport: ReportRecord;
        try {
          normalizedReport = {
            ...report,
            data: normalizeVqaReportData(report.data),
          };
        } catch (error: unknown) {
          console.error("Could not read VQA report data.", error);
          this.errorMessage.set("This report contains invalid data.");
          this.isLoading.set(false);
          return;
        }
        this.report.set(normalizedReport);
        this.isLoading.set(false);
        this.loadImages(normalizedReport);
      },
      error: (error: unknown) => {
        console.error("Could not load VQA report.", error);
        this.errorMessage.set(
          this.errorMessageFor(error, "Could not load this report."),
        );
        this.isLoading.set(false);
      },
    });
  }

  createTable(): void {
    const columns = [
      this.createColumn("Column 1"),
      this.createColumn("Column 2"),
    ];
    const table: VqaTable = {
      id: crypto.randomUUID(),
      type: "table",
      title: "New table",
      columns,
      rows: [{ id: crypto.randomUUID(), cells: this.emptyCells(columns) }],
    };
    this.addElement(table);
  }

  createParagraph(): void {
    this.addElement({
      id: crypto.randomUUID(),
      type: "paragraph",
      title: "New paragraph section",
      paragraphs: [{ id: crypto.randomUUID(), text: "" }],
    });
  }

  createImage(): void {
    this.addElement({ id: crypto.randomUUID(), type: "image", caption: "" });
  }

  removeElement(element: VqaContentElement): void {
    const rowIds =
      element.type === "table" ? element.rows.map((row) => row.id) : [];
    this.removeImagesForRows([element.id, ...rowIds]);
    this.updateElements((elements) =>
      elements.filter((item) => item.id !== element.id),
    );
  }

  moveElement(elementId: string, direction: -1 | 1): void {
    this.updateElements((elements) => {
      const currentIndex = elements.findIndex(
        (element) => element.id === elementId,
      );
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= elements.length) {
        return elements;
      }
      const reordered = [...elements];
      [reordered[currentIndex], reordered[nextIndex]] = [
        reordered[nextIndex],
        reordered[currentIndex],
      ];
      return reordered;
    });
  }

  updateParagraphTitle(elementId: string, title: string): void {
    this.updateElements((elements) =>
      elements.map((element) =>
        element.id === elementId && element.type === "paragraph"
          ? { ...element, title }
          : element,
      ),
    );
  }

  addParagraph(elementId: string): void {
    this.updateElements((elements) =>
      elements.map((element) =>
        element.id === elementId && element.type === "paragraph"
          ? {
              ...element,
              paragraphs: [
                ...element.paragraphs,
                { id: crypto.randomUUID(), text: "" },
              ],
            }
          : element,
      ),
    );
  }

  updateParagraphText(
    elementId: string,
    paragraphId: string,
    text: string,
  ): void {
    this.updateElements((elements) =>
      elements.map((element) =>
        element.id === elementId && element.type === "paragraph"
          ? {
              ...element,
              paragraphs: element.paragraphs.map((paragraph) =>
                paragraph.id === paragraphId
                  ? { ...paragraph, text }
                  : paragraph,
              ),
            }
          : element,
      ),
    );
  }

  removeParagraph(elementId: string, paragraphId: string): void {
    this.updateElements((elements) =>
      elements.map((element) =>
        element.id === elementId &&
        element.type === "paragraph" &&
        element.paragraphs.length > 1
          ? {
              ...element,
              paragraphs: element.paragraphs.filter(
                (paragraph) => paragraph.id !== paragraphId,
              ),
            }
          : element,
      ),
    );
  }

  updateImageCaption(elementId: string, caption: string): void {
    this.updateElements((elements) =>
      elements.map((element) =>
        element.id === elementId && element.type === "image"
          ? { ...element, caption }
          : element,
      ),
    );
    this.updateCaption(elementId, caption);
  }

  duplicateTable(tableId: string): void {
    const source = this.getTable(tableId);
    if (!source) return;
    const columns = source.columns.map((column) => ({
      ...column,
      id: crypto.randomUUID(),
    }));
    const rowCount = Math.max(source.rows.length, 1);
    const duplicate: VqaTable = {
      id: crypto.randomUUID(),
      type: "table",
      title: `${source.title} copy`,
      columns,
      rows: Array.from({ length: rowCount }, () => ({
        id: crypto.randomUUID(),
        cells: this.emptyCells(columns),
      })),
    };
    this.addElement(duplicate);
  }

  updateTableTitle(tableId: string, title: string): void {
    this.updateTable(tableId, (table) => ({ ...table, title }));
  }

  addColumn(tableId: string): void {
    const table = this.getTable(tableId);
    if (!table) return;
    const column = this.createColumn(`Column ${table.columns.length + 1}`);
    this.updateTable(tableId, (item) => ({
      ...item,
      columns: [...item.columns, column],
      rows: item.rows.map((row) => ({
        ...row,
        cells: { ...row.cells, [column.id]: null },
      })),
    }));
  }

  removeColumn(tableId: string, columnId: string): void {
    const table = this.getTable(tableId);
    if (!table || table.columns.length <= 1) return;
    this.updateTable(tableId, (item) => ({
      ...item,
      columns: item.columns.filter((column) => column.id !== columnId),
      rows: item.rows.map((row) => {
        const cells = { ...row.cells };
        delete cells[columnId];
        return { ...row, cells };
      }),
    }));
  }

  addRow(tableId: string): void {
    this.updateTable(tableId, (table) => ({
      ...table,
      rows: [
        ...table.rows,
        {
          id: crypto.randomUUID(),
          cells: this.emptyCells(table.columns),
        },
      ],
    }));
  }

  removeRow(tableId: string, rowId: string): void {
    const table = this.getTable(tableId);
    if (!table || table.rows.length <= 1) return;
    this.removeImagesForRows([rowId]);
    this.updateTable(tableId, (item) => ({
      ...item,
      rows: item.rows.filter((row) => row.id !== rowId),
    }));
  }

  updateColumn(
    tableId: string,
    columnId: string,
    changes: Partial<Pick<VqaTableColumn, "title">>,
  ): void {
    this.updateTable(tableId, (table) => ({
      ...table,
      columns: table.columns.map((column) =>
        column.id === columnId ? { ...column, ...changes } : column,
      ),
    }));
  }

  updateColumnType(
    tableId: string,
    columnId: string,
    type: VqaColumnType,
  ): void {
    this.updateTable(tableId, (table) => {
      const previous = table.columns.find((column) => column.id === columnId);
      if (!previous || previous.type === type) return table;
      const nextColumn = this.withColumnType(previous, type);
      return {
        ...table,
        columns: table.columns.map((column) =>
          column.id === columnId ? nextColumn : column,
        ),
        rows: table.rows.map((row) => ({
          ...row,
          cells: {
            ...row.cells,
            [columnId]: this.convertCellValue(row.cells[columnId], nextColumn),
          },
        })),
      };
    });
  }

  updateRatingBound(
    tableId: string,
    columnId: string,
    field: "min" | "max",
    value: number | null,
  ): void {
    if (value === null || !Number.isInteger(value) || value < 0 || value > 100)
      return;
    const column = this.getTable(tableId)?.columns.find(
      (item) => item.id === columnId,
    );
    if (
      !column ||
      column.type !== "rating" ||
      (field === "min" && value >= (column.max ?? 5)) ||
      (field === "max" && value <= (column.min ?? 1))
    ) {
      return;
    }
    this.updateTable(tableId, (table) => {
      const updatedColumn = { ...column, [field]: value };
      return {
        ...table,
        columns: table.columns.map((item) =>
          item.id === columnId ? updatedColumn : item,
        ),
        rows: table.rows.map((row) => {
          const cell = row.cells[columnId];
          return {
            ...row,
            cells: {
              ...row.cells,
              [columnId]:
                typeof cell === "number" &&
                (cell < (updatedColumn.min ?? 1) ||
                  cell > (updatedColumn.max ?? 5))
                  ? null
                  : cell,
            },
          };
        }),
      };
    });
  }

  updateCell(
    tableId: string,
    rowId: string,
    column: VqaTableColumn,
    value: VqaCellValue,
  ): void {
    const normalizedValue = this.convertCellValue(value, column);
    this.updateTable(tableId, (table) => ({
      ...table,
      rows: table.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              cells: {
                ...row.cells,
                [column.id]: normalizedValue,
              },
            }
          : row,
      ),
    }));
  }

  cellValue(row: VqaTable["rows"][number], columnId: string): VqaCellValue {
    return row.cells[columnId] ?? null;
  }

  displayCellValue(value: VqaCellValue, column: VqaTableColumn): string {
    if (value === null || value === "") return "—";
    if (column.type === "yesNo") return value ? "Yes" : "No";
    if (column.type === "rating") {
      return `${value} / ${column.max ?? 5}`;
    }
    return String(value);
  }

  updateTitle(title: string): void {
    this.report.update((report) => (report ? { ...report, title } : report));
    this.clearMessages();
  }

  updateMetadata(
    field: keyof ReportRecord["data"]["metadata"],
    value: string,
  ): void {
    this.report.update((report) =>
      report
        ? {
            ...report,
            data: {
              ...report.data,
              metadata: { ...report.data.metadata, [field]: value },
            },
          }
        : report,
    );
    this.clearMessages();
  }

  updateCaption(entryId: string, caption: string): void {
    this.captionDrafts.update((drafts) => ({ ...drafts, [entryId]: caption }));
  }

  uploadImage(entryId: string, event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    if (!file) return;
    const report = this.report();
    const caption = this.captionDrafts()[entryId]?.trim();
    if (!report || !caption) {
      this.attachmentError.set("Enter a caption before attaching the image.");
      input.value = "";
      return;
    }

    this.attachmentError.set(null);
    this.isSaving.set(true);
    this.reportsApi
      .save(report.id, report.title, "draft", report.data)
      .subscribe({
        next: ({ report: savedReport }) => {
          this.setSavedReport(savedReport);
          this.reportsApi
            .uploadImage(savedReport.id, entryId, caption, file)
            .subscribe({
              next: ({ attachment }) => {
                this.report.update((current) =>
                  current
                    ? {
                        ...current,
                        attachments: [...current.attachments, attachment],
                      }
                    : current,
                );
                const url = URL.createObjectURL(file);
                this.objectUrls.add(url);
                this.imagePreviews.update((previews) => ({
                  ...previews,
                  [attachment.id]: url,
                }));
                this.captionDrafts.update((drafts) => ({
                  ...drafts,
                  [entryId]: "",
                }));
                this.isSaving.set(false);
                input.value = "";
              },
              error: (error: unknown) => {
                console.error("Could not attach the image.", error);
                this.attachmentError.set(
                  this.errorMessageFor(error, "Could not attach this image."),
                );
                this.isSaving.set(false);
                input.value = "";
              },
            });
        },
        error: (error: unknown) => {
          console.error("Could not save report before image upload.", error);
          this.attachmentError.set(
            this.errorMessageFor(
              error,
              "Save the report before adding an image.",
            ),
          );
          this.isSaving.set(false);
          input.value = "";
        },
      });
  }

  removeImage(attachment: ReportAttachment): void {
    const report = this.report();
    if (!report) return;
    this.reportsApi.deleteImage(report.id, attachment.id).subscribe({
      next: () => {
        this.report.update((current) =>
          current
            ? {
                ...current,
                attachments: current.attachments.filter(
                  (image) => image.id !== attachment.id,
                ),
              }
            : current,
        );
        this.revokePreview(attachment.id);
      },
      error: (error: unknown) => {
        console.error("Could not remove the image.", error);
        this.attachmentError.set(
          this.errorMessageFor(error, "Could not remove this image."),
        );
      },
    });
  }

  attachmentsFor(entryId: string): ReportAttachment[] {
    return (
      this.report()?.attachments.filter(
        (attachment) => attachment.entryId === entryId,
      ) ?? []
    );
  }

  previewFor(attachmentId: string): string | null {
    return this.imagePreviews()[attachmentId] ?? null;
  }

  imageNumber(attachmentId: string): number {
    const index =
      this.report()?.attachments.findIndex(
        (attachment) => attachment.id === attachmentId,
      ) ?? -1;
    return index + 1;
  }

  saveDraft(): void {
    this.persist("draft");
  }

  completeReport(): void {
    this.persist("completed");
  }

  saveAsPdf(): void {
    const report = this.report();
    if (!report || this.isLoadingImages()) return;
    if (report.status === "completed") {
      this.openPrintDialog();
      return;
    }
    this.isSaving.set(true);
    this.reportsApi
      .save(report.id, report.title, "draft", report.data)
      .subscribe({
        next: ({ report: savedReport }) => {
          this.setSavedReport(savedReport);
          this.isSaving.set(false);
          this.openPrintDialog();
        },
        error: (error: unknown) => {
          console.error("Could not save the report before PDF export.", error);
          this.errorMessage.set(
            this.errorMessageFor(
              error,
              "Could not save the report before PDF export.",
            ),
          );
          this.isSaving.set(false);
        },
      });
  }

  retryImageLoad(): void {
    const report = this.report();
    if (report) this.loadImages(report);
  }

  private persist(status: "draft" | "completed"): void {
    const report = this.report();
    if (!report || this.isSaving()) return;
    this.isSaving.set(true);
    this.clearMessages();
    this.reportsApi
      .save(report.id, report.title, status, report.data)
      .subscribe({
        next: ({ report: savedReport }) => {
          this.setSavedReport(savedReport);
          this.successMessage.set(
            status === "completed" ? "Report completed." : "Draft saved.",
          );
          this.isSaving.set(false);
        },
        error: (error: unknown) => {
          console.error("Could not save VQA report.", error);
          this.errorMessage.set(
            this.errorMessageFor(error, "Could not save this report."),
          );
          this.isSaving.set(false);
        },
      });
  }

  private loadImages(report: ReportRecord): void {
    this.imageError.set(null);
    this.isLoadingImages.set(report.attachments.length > 0);
    if (report.attachments.length === 0) {
      this.imagePreviews.set({});
      return;
    }

    forkJoin(
      report.attachments.map((attachment) =>
        this.reportsApi.getImage(attachment.url),
      ),
    ).subscribe({
      next: (images) => {
        const previews: Record<string, string> = {};
        images.forEach((image, index) => {
          const url = URL.createObjectURL(image);
          this.objectUrls.add(url);
          previews[report.attachments[index].id] = url;
        });
        this.imagePreviews.set(previews);
        this.isLoadingImages.set(false);
      },
      error: (error: unknown) => {
        console.error("Could not load report images.", error);
        this.imageError.set("Some report images could not be loaded.");
        this.isLoadingImages.set(false);
      },
    });
  }

  private revokePreview(attachmentId: string): void {
    const url = this.imagePreviews()[attachmentId];
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(url);
    }
    this.imagePreviews.update((previews) => {
      const remaining = { ...previews };
      delete remaining[attachmentId];
      return remaining;
    });
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private openPrintDialog(): void {
    const report = this.report();
    if (!report) return;
    this.previousDocumentTitle = document.title;
    document.title = report.title.replace(/[\\/:*?"<>|]/g, "-");
    document.documentElement.classList.add("report-printing");
    window.print();
  }

  private setSavedReport(savedReport: ReportRecord): void {
    const normalizedReport = {
      ...savedReport,
      data: normalizeVqaReportData(savedReport.data),
    };
    const retainedAttachments = new Set(
      normalizedReport.attachments.map((attachment) => attachment.id),
    );
    for (const attachment of this.report()?.attachments ?? []) {
      if (!retainedAttachments.has(attachment.id)) {
        this.revokePreview(attachment.id);
      }
    }
    this.report.set(normalizedReport);
  }

  private getTable(tableId: string): VqaTable | undefined {
    return this.report()?.data.elements.find(
      (element): element is VqaTable =>
        element.id === tableId && element.type === "table",
    );
  }

  private updateTable(
    tableId: string,
    update: (table: VqaTable) => VqaTable,
  ): void {
    this.updateElements((elements) =>
      elements.map((element) =>
        element.id === tableId && element.type === "table"
          ? update(element)
          : element,
      ),
    );
  }

  private addElement(element: VqaContentElement): void {
    this.updateElements((elements) => [...elements, element]);
  }

  private updateElements(
    update: (elements: VqaContentElement[]) => VqaContentElement[],
  ): void {
    this.report.update((report) =>
      report
        ? {
            ...report,
            data: { ...report.data, elements: update(report.data.elements) },
          }
        : report,
    );
    this.clearMessages();
  }

  private createColumn(
    title: string,
    type: VqaColumnType = "text",
  ): VqaTableColumn {
    return type === "rating"
      ? { id: crypto.randomUUID(), title, type, min: 1, max: 5 }
      : { id: crypto.randomUUID(), title, type };
  }

  private emptyCells(columns: VqaTableColumn[]): Record<string, VqaCellValue> {
    return Object.fromEntries(columns.map((column) => [column.id, null]));
  }

  private withColumnType(
    column: VqaTableColumn,
    type: VqaColumnType,
  ): VqaTableColumn {
    if (type === "rating") {
      return { ...column, type, min: column.min ?? 1, max: column.max ?? 5 };
    }
    const converted = { ...column, type };
    delete converted.min;
    delete converted.max;
    return converted;
  }

  private convertCellValue(
    value: VqaCellValue,
    column: VqaTableColumn,
  ): VqaCellValue {
    if (value === null) return null;
    switch (column.type) {
      case "text":
        return String(value);
      case "date":
        return typeof value === "string" ? value : String(value);
      case "number": {
        const number =
          typeof value === "number"
            ? value
            : typeof value === "string" && value.trim()
              ? Number(value)
              : Number.NaN;
        return Number.isFinite(number) ? number : null;
      }
      case "yesNo":
        if (typeof value === "boolean") return value;
        if (value === "true") return true;
        if (value === "false") return false;
        return null;
      case "rating": {
        const number =
          typeof value === "number"
            ? value
            : typeof value === "string" && value.trim()
              ? Number(value)
              : Number.NaN;
        return Number.isInteger(number) &&
          number >= (column.min ?? 1) &&
          number <= (column.max ?? 5)
          ? number
          : null;
      }
    }
  }

  private removeImagesForRows(rowIds: string[]): void {
    const removed = new Set(rowIds);
    const attachments = this.report()?.attachments ?? [];
    for (const attachment of attachments) {
      if (removed.has(attachment.entryId)) this.revokePreview(attachment.id);
    }
    this.report.update((report) =>
      report
        ? {
            ...report,
            attachments: report.attachments.filter(
              (attachment) => !removed.has(attachment.entryId),
            ),
          }
        : report,
    );
  }

  private errorMessageFor(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message: unknown = error.error?.error;
      if (typeof message === "string" && message.trim()) return message;
    }
    return fallback;
  }
}
