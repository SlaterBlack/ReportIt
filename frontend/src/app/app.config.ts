import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";
import { authInterceptor } from "./core/interceptors/auth-interceptor";
import { Appearance } from "./core/services/appearance";
import { Branding } from "./core/services/branding";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => {
      inject(Appearance);
      return inject(Branding).load();
    }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: "enabled",
        scrollPositionRestoration: "enabled",
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
