import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Shell } from "./shell";

describe("Shell", () => {
  let fixture: ComponentFixture<Shell>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem("reportit_token");
    localStorage.removeItem("reportit_user");
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it("shows ReportIt navigation without loading services", () => {
    expect(fixture.nativeElement.textContent).toContain("ReportIt");
    expect(fixture.nativeElement.textContent).toContain("Report templates");
    expect(fixture.nativeElement.textContent).toContain("My reports");
    http.expectNone("/api/services");
  });

  it("loads other services from StoreIt when the logo menu opens", () => {
    fixture.nativeElement.querySelector(".navbar-brand").click();
    fixture.detectChanges();

    http.expectOne("/api/services").flush({
      services: [
        {
          id: "reportit",
          name: "ReportIt",
          url: "https://reportit.ai3d.com.au/",
          logoUrl: "https://reportit.ai3d.com.au/ReportIt_32.png",
        },
        {
          id: "clockit",
          name: "ClockIt",
          url: "https://clockit.ai3d.com.au/",
          logoUrl: "https://clockit.ai3d.com.au/ClockItLogo_32x32.png",
        },
      ],
    });
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll(".service-menu-item");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("ClockIt");
    expect(links[0].href).toBe("https://clockit.ai3d.com.au/");
  });

  it("opens account controls without loading service data", () => {
    fixture.nativeElement.querySelector(".account-menu-trigger").click();
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector(".account-menu-panel");
    expect(menu.textContent).toContain("My account");
    expect(menu.textContent).toContain("Appearance");
    expect(menu.textContent).toContain("Log out");
    http.expectNone("/api/services");
  });
});
