import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar.component';
import { FooterComponent } from '../../../shared/footer.component';
import { IconComponent } from '../../../shared/icon.component';

/**
 * Order history has no backend yet — there is no orders endpoint on the API —
 * so this deliberately shows the honest empty state rather than inventing fake
 * past orders that would disappear the moment real data arrives.
 */
@Component({
  selector: 'app-orders',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
    <app-navbar />

    <section class="container orders">
      <h1>My orders</h1>

      <div class="empty card">
        <div class="empty-image img-placeholder">
          <ui-icon name="package" [size]="34" />
        </div>
        <h2>No orders yet</h2>
        <p>
          Once you place an order it will appear here with its delivery status.
        </p>
        <button class="btn btn-primary" routerLink="/products">
          Start shopping
        </button>
      </div>

      <p class="note">
        <ui-icon name="info" [size]="13" />
        Order history is not connected to the API yet.
      </p>
    </section>

    <app-footer />
  `,
  styles: [
    `
      .orders {
        padding: 30px 32px 64px;
      }
      h1 {
        font-size: 27px;
        margin-bottom: 22px;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 54px 32px 58px;
        gap: 12px;
      }
      .empty-image {
        width: 130px;
        height: 130px;
        border-radius: 50%;
        color: var(--color-muted-2);
        margin-bottom: 8px;
      }
      .empty h2 {
        font-size: 19px;
      }
      .empty p {
        color: var(--color-muted);
        font-size: 14px;
        max-width: 380px;
        margin-bottom: 8px;
      }
      .note {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 18px;
        color: var(--color-muted);
        font-size: 12.5px;
      }
    `,
  ],
})
export class Orders {}
