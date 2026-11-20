import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Branding } from "./branding";

describe("Branding", () => {
  let branding: Branding;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    branding = TestBed.inject(Branding);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("loads the current instance brand", async () => {
    const loading = branding.load();
    http.expectOne("/brand-config.json").flush({
      companyName: "Ai3D",
      logoPath: null,
    });
    await loading;

    expect(branding.brand()).toEqual({
      companyName: "Ai3D",
      logoPath: null,
      logoLightPath: null,
      logoDarkPath: null,
    });
  });

  it("uses the light or dark instance logo according to the theme", async () => {
    const loading = branding.load();
    http.expectOne("/brand-config.json").flush({
      companyName: "Ai3D",
      logoPath: null,
      logoLightPath: "/instance-assets/ai3d_logo_short.png",
      logoDarkPath: "/instance-assets/ai3d_logo_short._WHITE.png",
    });
    await loading;

    expect(branding.logoFor("default")).toBe(
      "/instance-assets/ai3d_logo_short.png",
    );
    expect(branding.logoFor("retro")).toBe(
      "/instance-assets/ai3d_logo_short._WHITE.png",
    );
  });

  it("rejects invalid instance branding", async () => {
    const loading = branding.load();
    http.expectOne("/brand-config.json").flush({
      companyName: "Ai3D",
      logoPath: "https://example.com/logo.png",
    });

    await expect(loading).rejects.toThrow(
      "ReportIt returned invalid instance branding.",
    );
    expect(branding.brand()).toBeNull();
  });
});
