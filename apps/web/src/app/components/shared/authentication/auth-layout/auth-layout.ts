import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  readonly eyebrow = input('Buyer account');
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly admin = input(false);
}
