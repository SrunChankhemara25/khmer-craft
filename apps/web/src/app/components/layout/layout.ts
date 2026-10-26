import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from './header';
import { AppFooter } from './footer';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, AppHeader, AppFooter],
  template: `
    <app-header />
    <main>
      <router-outlet />
    </main>
    <app-footer />
  `,
})
export class AppLayout {}
