import { Routes } from "@angular/router";
import { adminGuard } from "./core/guards/admin-guard";
import { authGuard } from "./core/guards/auth-guard";
import { Login } from "./features/auth/login/login";
import { Home } from "./features/home/home";
import { Profile } from "./features/profile/profile";
import { Shell } from "./layout/shell/shell";

export const routes: Routes = [
  { path: "login", component: Login },
  {
    path: "",
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: "", pathMatch: "full", redirectTo: "templates" },
      { path: "home", component: Home },
      {
        path: "templates",
        loadComponent: () =>
          import("./features/reports/report-templates").then(
            (m) => m.ReportTemplates,
          ),
      },
      {
        path: "reports",
        loadComponent: () =>
          import("./features/reports/my-reports").then((m) => m.MyReports),
      },
      { path: "profile", component: Profile },
      {
        path: "users",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/users/users").then((m) => m.Users),
      },
      { path: "**", redirectTo: "home" },
    ],
  },
];
