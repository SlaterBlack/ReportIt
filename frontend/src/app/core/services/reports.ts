import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  ReportAttachment,
  ReportRecord,
  ReportStatus,
  VqaReportData,
} from "../models/report.model";

@Injectable({ providedIn: "root" })
export class Reports {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = "/api/reportit/reports";

  list(): Observable<{ reports: ReportRecord[] }> {
    return this.http.get<{ reports: ReportRecord[] }>(this.apiUrl);
  }

  create(
    title: string,
    data: VqaReportData,
  ): Observable<{ report: ReportRecord }> {
    return this.http.post<{ report: ReportRecord }>(this.apiUrl, {
      templateId: "vqa",
      title,
      data,
    });
  }

  get(id: string): Observable<{ report: ReportRecord }> {
    return this.http.get<{ report: ReportRecord }>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
    );
  }

  save(
    id: string,
    title: string,
    status: ReportStatus,
    data: VqaReportData,
  ): Observable<{ report: ReportRecord }> {
    return this.http.patch<{ report: ReportRecord }>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
      { title, status, data },
    );
  }

  uploadImage(
    reportId: string,
    entryId: string,
    caption: string,
    file: File,
  ): Observable<{ attachment: ReportAttachment }> {
    const body = new FormData();
    body.set("entryId", entryId);
    body.set("caption", caption);
    body.set("file", file);
    return this.http.post<{ attachment: ReportAttachment }>(
      `${this.apiUrl}/${encodeURIComponent(reportId)}/attachments`,
      body,
    );
  }

  getImage(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: "blob" });
  }

  deleteImage(reportId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachmentId)}`,
    );
  }
}
