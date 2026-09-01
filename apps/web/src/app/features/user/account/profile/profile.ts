import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { CartService } from '../../../../core/cart/cart.service';
import { WishlistService } from '../../../../core/wishlist/wishlist.service';
import { NavbarComponent } from '../../../../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../../../../components/shared/layout/footer/footer.component';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
    <app-navbar />

    <section class="container profile">
      <h1>My profile</h1>

      @if (user(); as currentUser) {
        <div class="grid">
          <article class="card details">
            <h2>Account details</h2>
            <dl>
              <dt>Name</dt>
              <dd>{{ currentUser.name }}</dd>
              <dt>Email</dt>
              <dd>{{ currentUser.email }}</dd>
              @if (currentUser.phone) {
                <dt>Phone</dt>
                <dd>{{ currentUser.phone }}</dd>
              }
              <dt>Role</dt>
              <dd>{{ currentUser.role }}</dd>
            </dl>

            <div class="actions">
              <button
                class="btn btn-outline btn-sm"
                routerLink="/account/change-password"
              >
                Change password
              </button>
              <button
                class="btn btn-ghost btn-sm"
                (click)="signOut()"
                [disabled]="signingOut()"
              >
                {{ signingOut() ? 'Signing out…' : 'Sign out' }}
              </button>
            </div>
          </article>

          <div class="links">
            @if (currentUser.role === 'SELLER') {
              <a class="card link-card card-hover" routerLink="/seller/dashboard">
                <ui-icon name="package" [size]="18" />
                <div>
                  <strong>Seller Dashboard</strong>
                  <span>Manage your store and orders</span>
                </div>
              </a>
            }
            <a class="card link-card card-hover" routerLink="/orders">
              <ui-icon name="package" [size]="18" />
              <div>
                <strong>My orders</strong>
                <span>Track and review past orders</span>
              </div>
            </a>
            <a class="card link-card card-hover" routerLink="/wishlist">
              <ui-icon name="heart" [size]="18" />
              <div>
                <strong>Wishlist</strong>
                <span>{{ wishlistCount() }} saved items</span>
              </div>
            </a>
            <a class="card link-card card-hover" routerLink="/cart">
              <ui-icon name="cart" [size]="18" />
              <div>
                <strong>Cart</strong>
                <span>{{ cartCount() }} items ready to check out</span>
              </div>
            </a>
          </div>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .profile {
        padding: 30px 32px 64px;
      }
      h1 {
        font-size: 27px;
        margin-bottom: 22px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        gap: 20px;
        align-items: start;
      }
      .details {
        padding: 22px 24px;
      }
      .details h2 {
        font-size: 16px;
        margin-bottom: 16px;
      }
      dl {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 10px 16px;
        margin: 0 0 20px;
        font-size: 14px;
      }
      dt {
        color: var(--color-muted);
      }
      dd {
        margin: 0;
        font-weight: 550;
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .links {
        display: grid;
        gap: 12px;
      }
      .link-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 18px;
        color: var(--color-text);
      }
      .link-card div {
        display: flex;
        flex-direction: column;
      }
      .link-card strong {
        font-size: 14px;
      }
      .link-card span {
        color: var(--color-muted);
        font-size: 12.5px;
      }
      @media (max-width: 860px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);

  protected readonly user = this.auth.user;
  protected readonly cartCount = this.cart.count;
  protected readonly wishlistCount = this.wishlist.count;
  protected readonly signingOut = signal(false);

  protected signOut(): void {
    this.signingOut.set(true);
    // Navigate on both paths: the cookie is cleared server-side either way,
    // and stranding the user on a page they can no longer load helps nobody.
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.router.navigateByUrl('/'),
    });
  }
}
