import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../shared/navbar.component';
import { FooterComponent } from '../shared/footer.component';
import { IconComponent } from '../shared/icon.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-become-seller',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar></app-navbar>

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-copy animate-in">
        <span class="badge badge-soft"><ui-icon name="store" [size]="13"></ui-icon> For Artisans &amp; Producers</span>
        <h1>Turn your craft into a thriving business</h1>
        <p>Join 1,200+ Cambodian sellers reaching customers across the country and around the world. No listing fees, transparent payouts, full support.</p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" (click)="scrollToForm()">Start Selling Now <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>
          <button class="btn btn-outline btn-lg">See Success Stories</button>
        </div>
        <div class="hero-trust">
          <span><ui-icon name="check-circle" [size]="14"></ui-icon> No setup fees</span>
          <span><ui-icon name="check-circle" [size]="14"></ui-icon> Get paid weekly</span>
          <span><ui-icon name="check-circle" [size]="14"></ui-icon> Free seller training</span>
        </div>
      </div>
      <div class="hero-image img-placeholder dark animate-scale delay-1">Seller workshop</div>
    </div>
  </section>

  <section class="container stats-row">
    <div class="stat" *ngFor="let s of stats">
      <strong>{{ s.value }}</strong>
      <small>{{ s.label }}</small>
    </div>
  </section>

  <section class="container why-section">
    <div class="section-head-center">
      <h2>Why sell on KhmerCraft</h2>
      <p>Everything you need to grow, without the overhead of running your own store.</p>
    </div>
    <div class="why-grid">
      <div class="why-card" *ngFor="let w of benefits">
        <div class="why-icon"><ui-icon [name]="w.icon" [size]="22" color="var(--color-accent)"></ui-icon></div>
        <strong>{{ w.title }}</strong>
        <small>{{ w.desc }}</small>
      </div>
    </div>
  </section>

  <section class="container steps-section">
    <div class="section-head-center">
      <h2>Get started in four steps</h2>
      <p>Most sellers are live within 48 hours of applying.</p>
    </div>
    <div class="steps-grid">
      <div class="step-card" *ngFor="let s of steps; let i = index">
        <div class="step-num">{{ i + 1 }}</div>
        <div class="step-icon"><ui-icon [name]="s.icon" [size]="20" color="var(--color-accent)"></ui-icon></div>
        <strong>{{ s.title }}</strong>
        <small>{{ s.desc }}</small>
      </div>
    </div>
  </section>

  <section class="container form-section" id="apply-form">
    <div class="form-card">
      <div class="section-head-center">
        <h2>Apply to become a seller</h2>
        <p>Create your seller account and start listing products today.</p>
      </div>
      
      @if (error()) {
        <div class="notice error" role="alert" style="margin-bottom: 24px; padding: 12px; border-radius: 4px; background: #fee; color: #c00;">{{ error() }}</div>
      }

      <form class="apply-form" [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-grid">
          <div class="field">
            <label>Full Name</label>
            <input type="text" formControlName="name" placeholder="Your name">
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <small class="error-text">Name is required.</small>
            }
          </div>
          <div class="field">
            <label>Phone Number</label>
            <input type="text" formControlName="phone" placeholder="+855 00 000 000">
          </div>
          <div class="field">
            <label>Email Address</label>
            <div class="input-icon-wrap">
              <ui-icon name="mail" [size]="16"></ui-icon>
              <input type="email" formControlName="email" placeholder="you@example.com">
            </div>
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <small class="error-text">Enter a valid email address.</small>
            }
          </div>
          <div class="field">
            <label>Password</label>
            <div class="input-icon-wrap">
              <ui-icon name="lock" [size]="16"></ui-icon>
              <input type="password" formControlName="password" placeholder="Min. 8 characters">
            </div>
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <small class="error-text">Password requires min 8 chars, 1 uppercase, 1 lowercase, and 1 number.</small>
            }
          </div>
          <div class="field">
            <label>Business / Shop Name</label>
            <input type="text" formControlName="businessName" placeholder="E.g. Srey Khmer Handmade">
            @if (form.controls.businessName.touched && form.controls.businessName.invalid) {
              <small class="error-text">Business name is required.</small>
            }
          </div>
          <div class="field">
            <label>Product Category</label>
            <select formControlName="category">
              <option value="" disabled>Select a category</option>
              <option value="Handmade Crafts">Handmade Crafts</option>
              <option value="Pottery">Pottery</option>
              <option value="Weaving">Weaving</option>
              <option value="Local Food">Local Food</option>
              <option value="Other">Other</option>
            </select>
            @if (form.controls.category.touched && form.controls.category.invalid) {
              <small class="error-text">Category is required.</small>
            }
          </div>
          <div class="field span-2">
            <label>Tell us about your products <span class="optional">(optional)</span></label>
            <textarea formControlName="description" rows="4" placeholder="What do you make, and where are you based?"></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading()">
          {{ loading() ? 'Submitting Application...' : 'Submit Application' }} <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon>
        </button>
        <p class="form-note">By applying, you agree to KhmerCraft's Seller Terms and Community Guidelines.</p>
      </form>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
    .hero { background: var(--color-bg-alt); padding: 56px 0; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
    .hero-copy h1 { font-size: 38px; line-height: 1.15; margin: 16px 0 18px; }
    .hero-copy p { color: var(--color-muted); font-size: 15px; max-width: 480px; margin-bottom: 24px; line-height: 1.65; }
    .hero-actions { display: flex; gap: 12px; margin-bottom: 22px; }
    .hero-trust { display: flex; gap: 20px; font-size: 12.5px; color: var(--color-muted); font-weight: 600; flex-wrap: wrap; }
    .hero-trust span { display: flex; align-items: center; gap: 6px; }
    .hero-image { height: 320px; border-radius: var(--radius-lg); }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 44px 32px; text-align: center; }
    .stat strong { font-size: 28px; font-family: var(--font-heading); display: block; color: var(--color-accent); }
    .stat small { color: var(--color-muted); font-size: 12.5px; }

    .section-head-center { text-align: center; margin-bottom: 36px; }
    .section-head-center h2 { font-size: 26px; margin-bottom: 8px; }
    .section-head-center p { color: var(--color-muted); font-size: 14px; }

    .why-section { padding: 20px 32px 56px; }
    .why-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .why-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; text-align: center; background: #fff; transition: all var(--dur-base) var(--ease-standard); }
    .why-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-sm); }
    .why-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
    .why-card strong { display: block; font-size: 14.5px; margin-bottom: 6px; }
    .why-card small { color: var(--color-muted); font-size: 12.5px; line-height: 1.5; }

    .steps-section { padding: 20px 32px 56px; background: var(--color-bg-alt); border-radius: var(--radius-lg); margin: 0 32px 56px; padding-top: 44px; padding-bottom: 44px; }
    .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .step-card { background: #fff; border-radius: var(--radius-md); padding: 22px; position: relative; }
    .step-num { position: absolute; top: 16px; right: 16px; font-size: 12px; font-weight: 700; color: var(--color-muted-2); }
    .step-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
    .step-card strong { display: block; font-size: 14px; margin-bottom: 6px; }
    .step-card small { color: var(--color-muted); font-size: 12.5px; line-height: 1.5; }

    .form-section { padding: 20px 32px 60px; }
    .form-card { max-width: 720px; margin: 0 auto; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 40px; background: #fff; }
    .apply-form .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
    .span-2 { grid-column: span 2; }
    .optional { font-weight: 400; color: var(--color-muted); }
    .apply-form textarea { width: 100%; padding: 11px 14px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); font-size: 14px; resize: vertical; font-family: var(--font-body); }
    .form-note { text-align: center; font-size: 12px; color: var(--color-muted); margin-top: 14px; }
    .error-text { color: #c00; font-size: 12px; display: block; margin-top: 4px; }

    @media (max-width: 980px) {
      .hero-inner { grid-template-columns: 1fr; }
      .stats-row, .why-grid, .steps-grid { grid-template-columns: repeat(2, 1fr); }
      .apply-form .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }
  `]
})
export class BecomeSellerComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal('');

  stats = [
    { value: '1,200+', label: 'Active sellers' },
    { value: '$2.4M', label: 'Paid to artisans' },
    { value: '48hrs', label: 'Avg. approval time' },
    { value: '4.8/5', label: 'Seller satisfaction' }
  ];

  benefits = [
    { icon: 'globe', title: 'National & global reach', desc: 'Your shop is discoverable by shoppers across Cambodia and abroad.' },
    { icon: 'wallet', title: 'Fast, transparent payouts', desc: 'Get paid weekly directly to your bank or mobile wallet.' },
    { icon: 'shield', title: 'Buyer trust built-in', desc: 'Escrow protection means buyers purchase with confidence.' },
    { icon: 'award', title: 'Marketing support', desc: 'Featured placements, blog features, and seasonal campaigns.' }
  ];

  steps = [
    { icon: 'edit', title: 'Apply online', desc: 'Fill out the short application below with your shop details.' },
    { icon: 'check-circle', title: 'Get verified', desc: 'Our team reviews your application within 48 hours.' },
    { icon: 'upload', title: 'List your products', desc: 'Add photos, pricing, and descriptions using our seller tools.' },
    { icon: 'trending-up', title: 'Start selling', desc: 'Go live and start reaching customers right away.' }
  ];

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    phone: new FormControl('', {
      nonNullable: true,
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    businessName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    category: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', {
      nonNullable: true,
    }),
  });

  scrollToForm() {
    document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const payload = this.form.getRawValue();
    this.auth
      .registerSeller(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/seller/orders');
        },
        error: (err) => {
          this.error.set(apiErrorMessage(err, 'Could not create seller account. Please check your information and try again.'));
        },
      });
  }
}
