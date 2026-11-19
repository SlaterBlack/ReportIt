import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Appearance, Theme } from "../../../core/services/appearance";
import { Login } from "./login";

describe("Login", () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  const theme = signal<Theme>("default");

  beforeEach(async () => {
    theme.set("default");
    localStorage.removeItem("reportit_token");
    localStorage.removeItem("reportit_user");
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Appearance, useValue: { theme } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it("applies the Retro class when Retro is selected", () => {
    theme.set("retro");
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(".login-page").classList,
    ).toContain("retro");
  });

  it("authenticates through StoreIt and opens the ReportIt home page", () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, "navigateByUrl").mockResolvedValue(true);
    fixture.componentInstance.email = "user@example.com";
    fixture.componentInstance.password = "password123";

    fixture.componentInstance.submit();

    const request = http.expectOne("/api/auth/login");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({
      email: "user@example.com",
      password: "password123",
    });
    request.flush({
      token: "test-token",
      user: {
        id: "user-1",
        name: "Report User",
        email: "user@example.com",
        role: "user",
        theme: "default",
      },
    });

    expect(localStorage.getItem("reportit_token")).toBe("test-token");
    expect(navigate).toHaveBeenCalledWith("/home");
  });
});
