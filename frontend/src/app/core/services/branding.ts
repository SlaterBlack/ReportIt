import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";

export interface ReportBrand {
  companyName: string;
  logoPath: string | null;
  logoLightPath?: string | null;
  logoDarkPath?: string | null;
}

function isInstanceAssetPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/instance-assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  );
}

function isReportBrand(value: unknown): value is ReportBrand {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const brand = value as Record<string, unknown>;
  return (
    typeof brand["companyName"] === "string" &&
    brand["companyName"].trim().length > 0 &&
    (brand["logoPath"] === null || isInstanceAssetPath(brand["logoPath"])) &&
    (brand["logoLightPath"] === undefined ||
      brand["logoLightPath"] === null ||
      isInstanceAssetPath(brand["logoLightPath"])) &&
    (brand["logoDarkPath"] === undefined ||
      brand["logoDarkPath"] === null ||
      isInstanceAssetPath(brand["logoDarkPath"]))
  );
}

@Injectable({ providedIn: "root" })
export class Branding {
  private readonly http = inject(HttpClient);
  readonly brand = signal<ReportBrand | null>(null);

  logoFor(theme: "default" | "retro"): string | null {
    const brand = this.brand();
    return theme === "retro"
      ? (brand?.logoDarkPath ?? brand?.logoPath ?? null)
      : (brand?.logoLightPath ?? brand?.logoPath ?? null);
  }

  async load(): Promise<void> {
    const config = await firstValueFrom(
      this.http.get<unknown>("/brand-config.json"),
    );
    if (!isReportBrand(config)) {
      throw new Error("ReportIt returned invalid instance branding.");
    }
    this.brand.set({
      companyName: config.companyName.trim(),
      logoPath: config.logoPath,
      logoLightPath: config.logoLightPath ?? null,
      logoDarkPath: config.logoDarkPath ?? null,
    });
  }
}
