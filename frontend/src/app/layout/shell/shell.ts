import { HttpClient } from "@angular/common/http";
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { Auth } from "../../core/services/auth";
import { AppearanceDialog } from "./appearance-dialog/appearance-dialog";

interface LinkedService {
  id: string;
  name: string;
  url: string;
  logoUrl: string;
}

interface ServiceDirectoryResponse {
  services: LinkedService[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isServiceDirectoryResponse(
  value: unknown,
): value is ServiceDirectoryResponse {
  if (!isRecord(value) || !Array.isArray(value["services"])) return false;
  return value["services"].every((service: unknown) => {
    if (!isRecord(service)) return false;
    return (
      typeof service["id"] === "string" &&
      typeof service["name"] === "string" &&
      isHttpUrl(service["url"]) &&
      isHttpUrl(service["logoUrl"])
    );
  });
}

@Component({
  selector: "app-shell",
  imports: [AppearanceDialog, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./shell.html",
  styleUrl: "./shell.scss",
})
export class Shell {
  private readonly http = inject(HttpClient);
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly isAccountMenuOpen = signal(false);
  readonly isServiceMenuOpen = signal(false);
  readonly availableServices = signal<LinkedService[]>([]);
  readonly serviceMenuState = signal<"idle" | "loading" | "loaded" | "error">(
    "idle",
  );
  readonly isAppearanceOpen = signal(false);
  private readonly serviceId = "reportit";

  toggleServiceMenu(): void {
    if (this.isServiceMenuOpen()) {
      this.closeServiceMenu();
      return;
    }

    this.closeAccountMenu();
    this.isServiceMenuOpen.set(true);
    if (this.serviceMenuState() !== "loading") this.loadServices();
  }

  closeServiceMenu(): void {
    this.isServiceMenuOpen.set(false);
  }

  retryServiceLoad(): void {
    this.loadServices();
  }

  toggleAccountMenu(): void {
    this.closeServiceMenu();
    this.isAccountMenuOpen.update((open) => !open);
  }

  openAppearance(): void {
    this.closeAccountMenu();
    this.closeServiceMenu();
    this.isAppearanceOpen.set(true);
  }

  closeAppearance(): void {
    this.isAppearanceOpen.set(false);
  }

  logout(): void {
    this.closeAccountMenu();
    this.closeServiceMenu();
    this.auth.logout();
    void this.router.navigateByUrl("/login");
  }

  closeAccountMenu(): void {
    this.isAccountMenuOpen.set(false);
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target instanceof Node)) return;
    const serviceSwitcher =
      this.elementRef.nativeElement.querySelector(".service-switcher");
    if (!serviceSwitcher?.contains(event.target)) this.closeServiceMenu();
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeAccountMenu();
    }
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.closeAccountMenu();
    this.closeServiceMenu();
    this.closeAppearance();
  }

  private loadServices(): void {
    this.serviceMenuState.set("loading");
    this.http.get<unknown>("/api/services").subscribe({
      next: (response) => {
        if (!isServiceDirectoryResponse(response)) {
          this.handleServiceLoadError(
            new Error("StoreIt returned an invalid service list."),
          );
          return;
        }
        this.availableServices.set(
          response.services.filter((service) => service.id !== this.serviceId),
        );
        this.serviceMenuState.set("loaded");
      },
      error: (error: unknown) => this.handleServiceLoadError(error),
    });
  }

  private handleServiceLoadError(error: unknown): void {
    console.error("Could not load linked services from StoreIt.", error);
    this.serviceMenuState.set("error");
  }
}
