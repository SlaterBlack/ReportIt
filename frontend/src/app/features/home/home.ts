import { Component, inject } from "@angular/core";
import { Auth } from "../../core/services/auth";

@Component({
  selector: "app-home",
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  readonly currentUser = inject(Auth).currentUser;
}
