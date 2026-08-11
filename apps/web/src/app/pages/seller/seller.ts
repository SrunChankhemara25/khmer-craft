import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KcIcon } from '../../components/ui/kc-icon';
import { faqItems, journeySteps } from '../../data/site-data';

@Component({
  selector: 'app-seller',
  imports: [FormsModule, KcIcon],
  styles: [`
    :host {
      display: block;
      background: #fafbf8;
      color: #222b35;
    }

    .seller-container {
      max-width: 1210px;
      margin: 0 auto;
      padding: 0 56px;
    }

    .hero {
      border-bottom: 1px solid #e2e7e1;
      padding: 60px 0 62px;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: 0.92fr 1.08fr;
      gap: 86px;
      align-items: center;
    }

    .breadcrumb {
      color: #68736f;
      font-size: 11px;
      font-weight: 700;
      margin: 0 0 18px;
    }

    .breadcrumb span {
      color: #176242;
    }

    .hero h1 {
      color: #202833;
      font-size: 43px;
      font-weight: 850;
      letter-spacing: -0.01em;
      line-height: 1.13;
      margin: 0 0 21px;
      max-width: 540px;
    }

    .hero h1 span {
      color: #176242;
    }

    .hero-copy {
      color: #5f6b67;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.62;
      margin: 0 0 29px;
      max-width: 488px;
    }

    .hero-actions {
      display: flex;
      gap: 16px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }

    .btn {
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      min-width: 148px;
      padding: 15px 22px;
      transition: background 0.15s, border-color 0.15s;
    }

    .btn-primary {
      background: #176242;
      border: 1px solid #176242;
      color: #fff;
    }

    .btn-primary:hover {
      background: #23724f;
    }

    .btn-secondary {
      background: #fffdfa;
      border: 1px solid #c8b9a6;
      color: #9a7555;
    }

    .btn-secondary:hover {
      background: #f7f2ea;
    }

    .social-proof {
      align-items: center;
      color: #68736f;
      display: flex;
      font-size: 11.5px;
      font-weight: 600;
      gap: 13px;
    }

    .avatar-stack {
      display: flex;
      padding-left: 2px;
    }

    .avatar-dot {
      background: #dce3ee;
      border: 2px solid #fafbf8;
      border-radius: 50%;
      height: 27px;
      margin-left: -8px;
      width: 27px;
    }

    .avatar-dot:first-child {
      margin-left: 0;
    }

    .avatar-dot:nth-child(2) {
      background: #cbd5e1;
    }

    .avatar-dot:nth-child(3) {
      background: #aab8ca;
    }

    .hero-media {
      position: relative;
    }

    .hero-image {
      border-radius: 10px;
      box-shadow: 0 18px 42px rgba(30, 43, 34, 0.16);
      display: block;
      height: 410px;
      object-fit: cover;
      width: 100%;
    }

    .verified-badge {
      align-items: center;
      background: #fff;
      border: 1px solid #edf1ec;
      border-radius: 9px;
      bottom: -32px;
      box-shadow: 0 13px 28px rgba(20, 33, 27, 0.14);
      display: flex;
      gap: 12px;
      left: -18px;
      padding: 15px 17px;
      position: absolute;
    }

    .badge-icon {
      align-items: center;
      background: #eef7f1;
      border-radius: 50%;
      color: #176242;
      display: flex;
      height: 34px;
      justify-content: center;
      width: 34px;
    }

    .verified-badge strong {
      color: #202833;
      display: block;
      font-size: 11px;
      line-height: 1.2;
    }

    .verified-badge span {
      color: #6a736f;
      display: block;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.3;
    }

    .gray-band {
      background: #e7e7e7;
      height: 486px;
    }

    .intro-band {
      background: #fafbf8;
      padding: 63px 24px 41px;
      text-align: center;
    }

    .section-title {
      color: #176242;
      font-size: 31px;
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1.2;
      margin: 0 0 15px;
    }

    .section-copy {
      color: #68736f;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.55;
      margin: 0 auto;
      max-width: 620px;
    }

    .journey {
      background: #f3f6f1;
      padding: 100px 0 103px;
    }

    .journey-head {
      margin-bottom: 64px;
      text-align: center;
    }

    .steps-grid {
      display: grid;
      gap: 36px;
      grid-template-columns: repeat(5, 1fr);
    }

    .step {
      position: relative;
      text-align: center;
    }

    .step-connector {
      background: #dbe1db;
      height: 1px;
      left: calc(50% + 28px);
      position: absolute;
      right: calc(-50% + 28px);
      top: 29px;
    }

    .step-number {
      align-items: center;
      background: #176242;
      border-radius: 50%;
      color: #fff;
      display: flex;
      font-size: 17px;
      font-weight: 800;
      height: 54px;
      justify-content: center;
      margin: 0 auto 19px;
      position: relative;
      width: 54px;
      z-index: 1;
    }

    .step h3 {
      color: #222b35;
      font-size: 16px;
      font-weight: 800;
      margin: 0 0 9px;
    }

    .step p {
      color: #68736f;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.45;
      margin: 0 auto;
      max-width: 128px;
    }

    .join {
      background: #fafbf8;
      border-bottom: 1px solid #eef1ec;
      border-top: 1px solid #e2e7e1;
    }

    .join-card {
      background: linear-gradient(90deg, #fafbf8 0 50%, #f4f6f3 50% 100%);
      border: 1px solid #e1e7df;
      border-radius: 0 13px 13px 0;
      display: grid;
      grid-template-columns: 1fr 1.05fr;
      min-height: 466px;
      overflow: hidden;
    }

    .join-copy {
      padding: 57px 56px;
    }

    .eyebrow {
      color: #459079;
      display: block;
      font-size: 11px;
      font-weight: 850;
      letter-spacing: 0.08em;
      margin-bottom: 18px;
      text-transform: uppercase;
    }

    .join-copy h2 {
      color: #202833;
      font-size: 33px;
      font-weight: 850;
      letter-spacing: -0.01em;
      line-height: 1.16;
      margin: 0 0 18px;
      max-width: 380px;
    }

    .join-copy p {
      color: #68736f;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.55;
      margin: 0 0 30px;
      max-width: 455px;
    }

    .join-points {
      display: flex;
      flex-direction: column;
      gap: 17px;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .join-points li {
      align-items: center;
      color: #46534f;
      display: flex;
      font-size: 13px;
      font-weight: 650;
      gap: 9px;
    }

    .point-icon {
      align-items: center;
      border: 1.5px solid #176242;
      border-radius: 50%;
      color: #176242;
      display: flex;
      height: 15px;
      justify-content: center;
      width: 15px;
    }

    .form-wrap {
      align-items: center;
      display: flex;
      padding: 52px 58px;
    }

    .seller-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
      width: 100%;
    }

    .form-row {
      display: grid;
      gap: 18px;
      grid-template-columns: 1fr 1fr;
    }

    .form-label {
      color: #68736f;
      display: block;
      font-size: 10px;
      font-weight: 800;
      margin-bottom: 7px;
    }

    input,
    select {
      background: #fbfcfa;
      border: 1px solid #cfd8cf;
      border-radius: 5px;
      color: #26302c;
      font-size: 12px;
      font-weight: 600;
      height: 48px;
      outline: none;
      padding: 0 16px;
      transition: border-color 0.15s, box-shadow 0.15s;
      width: 100%;
    }

    select {
      appearance: auto;
    }

    input::placeholder {
      color: #9ba5a1;
    }

    input:focus,
    select:focus {
      border-color: #176242;
      box-shadow: 0 0 0 3px rgba(23, 98, 66, 0.08);
    }

    .form-submit {
      background: #176242;
      border: 0;
      border-radius: 5px;
      box-shadow: 0 8px 16px rgba(23, 98, 66, 0.16);
      color: #fff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 850;
      height: 45px;
      margin-top: 1px;
      width: 100%;
    }

    .faq {
      background: #fafbf8;
      padding: 45px 0 75px;
    }

    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 17px;
      margin: 42px auto 0;
      max-width: 665px;
    }

    .faq-item {
      background: #fff;
      border: 1px solid #e8ece7;
      border-radius: 8px;
      overflow: hidden;
    }

    .faq-btn {
      align-items: center;
      background: transparent;
      border: 0;
      color: #2c322f;
      cursor: pointer;
      display: flex;
      font-size: 16px;
      font-weight: 800;
      justify-content: space-between;
      min-height: 66px;
      padding: 0 22px;
      text-align: left;
      width: 100%;
    }

    .faq-chevron {
      color: #202833;
      flex-shrink: 0;
      transition: transform 0.2s;
    }

    .faq-chevron.open {
      transform: rotate(180deg);
    }

    .faq-answer {
      border-top: 1px solid #eef1ec;
      color: #68736f;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.6;
      padding: 15px 22px 20px;
    }

    .bottom-cta {
      background: #fafbf8;
      padding: 0 0 37px;
    }

    .cta-panel {
      background: linear-gradient(180deg, #2d7654 0%, #4f815f 100%);
      border-radius: 34px;
      margin: 0 auto;
      max-width: 995px;
      padding: 56px 40px 57px;
      text-align: center;
    }

    .cta-panel h2 {
      color: #ace3bf;
      font-size: 40px;
      font-weight: 850;
      letter-spacing: -0.01em;
      line-height: 1.16;
      margin: 0 0 30px;
    }

    .cta-panel p {
      color: rgba(205, 238, 213, 0.82);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.6;
      margin: 0 auto 34px;
      max-width: 492px;
    }

    .cta-actions {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .cta-actions .btn {
      border-radius: 10px;
      font-size: 18px;
      min-width: 240px;
      padding: 18px 24px;
    }

    .cta-actions .btn-primary {
      background: #a8efc7;
      border-color: #a8efc7;
      color: #176242;
    }

    .cta-actions .btn-secondary {
      background: transparent;
      border-color: rgba(183, 228, 199, 0.45);
      color: #bce8ca;
    }

    @media (max-width: 980px) {
      .seller-container {
        padding: 0 24px;
      }

      .hero-grid,
      .join-card {
        grid-template-columns: 1fr;
      }

      .hero-grid {
        gap: 40px;
      }

      .join-card {
        background: #fafbf8;
        border-radius: 13px;
      }

      .form-wrap {
        background: #f4f6f3;
      }

      .steps-grid {
        grid-template-columns: repeat(2, 1fr);
        row-gap: 44px;
      }

      .step-connector {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .hero h1,
      .cta-panel h2 {
        font-size: 32px;
      }

      .hero {
        padding-top: 40px;
      }

      .gray-band {
        height: 260px;
      }

      .hero-image {
        height: 300px;
      }

      .verified-badge {
        left: 14px;
      }

      .steps-grid,
      .form-row {
        grid-template-columns: 1fr;
      }

      .join-copy,
      .form-wrap {
        padding: 34px 24px;
      }

      .cta-actions .btn {
        min-width: 100%;
      }
    }
  `],
  template: `
    <section class="hero">
      <div class="seller-container">
        <div class="hero-grid">
          <div>
            <p class="breadcrumb">Home&nbsp; &gt; &nbsp;<span>Become a Seller</span></p>
            <h1>Start selling your <span>local products</span> on KhmerCraft</h1>
            <p class="hero-copy">
              Join Cambodia's premier artisan community. Showcase your craftsmanship to a global
              audience while preserving our rich cultural heritage.
            </p>

            <div class="hero-actions">
              <button type="button" class="btn btn-primary" (click)="startOnboarding()">Start Selling</button>
              <button type="button" class="btn btn-secondary">Explore Store</button>
            </div>

            <div class="social-proof">
              <div class="avatar-stack" aria-hidden="true">
                <span class="avatar-dot"></span>
                <span class="avatar-dot"></span>
                <span class="avatar-dot"></span>
              </div>
              <span>Join 2,500+ Cambodian artisans already growing</span>
            </div>
          </div>

          <div class="hero-media">
            <img
              class="hero-image"
              src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1000&q=85"
              alt="Artisan molding pottery in a workshop"
            />
            <div class="verified-badge">
              <div class="badge-icon">
                <kc-icon name="check" [size]="15" />
              </div>
              <div>
                <strong>Verified Artisan</strong>
                <span>Premium Badge Status</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="gray-band" aria-hidden="true"></section>

    <section class="intro-band">
      <h2 class="section-title">Empowering Cambodian Craftsmanship</h2>
      <p class="section-copy">
        Everything you need to transform your workshop into a thriving digital business.
      </p>
    </section>

    <section class="journey">
      <div class="seller-container">
        <div class="journey-head">
          <h2 class="section-title">Your Journey to Success</h2>
          <p class="section-copy">Five simple steps to start selling your artisanal products.</p>
        </div>

        <div class="steps-grid">
          @for (step of journeySteps; track step.step; let last = $last) {
            <div class="step">
              @if (!last) {
                <div class="step-connector"></div>
              }
              <div class="step-number">{{ step.step }}</div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="join">
      <div class="join-card">
        <div class="join-copy">
          <span class="eyebrow">Quick Start</span>
          <h2>Ready to join our community?</h2>
          <p>
            Fill out the quick registration form and our team will get back to you within 24 hours
            to help you set up your store.
          </p>
          <ul class="join-points">
            @for (point of joinPoints; track point) {
              <li>
                <span class="point-icon"><kc-icon name="check" [size]="9" /></span>
                <span>{{ point }}</span>
              </li>
            }
          </ul>
        </div>

        <div class="form-wrap">
          <form class="seller-form" (submit)="onSubmit($event)">
            <div class="form-row">
              <label>
                <span class="form-label">Store Name</span>
                <input
                  type="text"
                  [(ngModel)]="form.storeName"
                  name="storeName"
                  placeholder="e.g. Silk Heritage Cambodia"
                />
              </label>
              <label>
                <span class="form-label">Seller Name</span>
                <input
                  type="text"
                  [(ngModel)]="form.sellerName"
                  name="sellerName"
                  placeholder="Full name"
                />
              </label>
            </div>

            <div class="form-row">
              <label>
                <span class="form-label">Phone Number</span>
                <input type="tel" [(ngModel)]="form.phone" name="phone" placeholder="+855" />
              </label>
              <label>
                <span class="form-label">Location</span>
                <select [(ngModel)]="form.location" name="location">
                  <option value="Phnom Penh">Phnom Penh</option>
                  <option value="Siem Reap">Siem Reap</option>
                  <option value="Battambang">Battambang</option>
                  <option value="Kampot">Kampot</option>
                  <option value="Kandal">Kandal</option>
                  <option value="Other">Other Province</option>
                </select>
              </label>
            </div>

            <label>
              <span class="form-label">Primary Category</span>
              <select [(ngModel)]="form.category" name="category">
                <option>Hand-woven Silk &amp; Textiles</option>
                <option>Pottery &amp; Ceramics</option>
                <option>Woodcarving &amp; Sculptures</option>
                <option>Jewelry &amp; Silverware</option>
                <option>Palm Sugar &amp; Food</option>
                <option>Bags &amp; Accessories</option>
              </select>
            </label>

            <button type="submit" class="form-submit">Register as Seller</button>
          </form>
        </div>
      </div>
    </section>

    <section id="faq" class="faq">
      <div class="seller-container">
        <h2 class="section-title" style="text-align:center;">Frequently Asked Questions</h2>
        <div class="faq-list">
          @for (faq of faqItems; track faq.question; let i = $index) {
            <div class="faq-item">
              <button
                type="button"
                class="faq-btn"
                (click)="toggleFaq(i)"
                [attr.aria-expanded]="openFaq() === i"
              >
                <span>{{ faq.question }}</span>
                <svg
                  class="faq-chevron"
                  [class.open]="openFaq() === i"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              @if (openFaq() === i) {
                <div class="faq-answer">{{ faq.answer }}</div>
              }
            </div>
          }
        </div>
      </div>
    </section>

    <section class="bottom-cta">
      <div class="seller-container">
        <div class="cta-panel">
          <h2>Ready to open your KhmerCraft store?</h2>
          <p>
            Join a community of hundreds of Cambodian makers and start growing your legacy today.
          </p>
          <div class="cta-actions">
            <button type="button" class="btn btn-primary" (click)="startOnboarding()">Start Selling Now</button>
            <button type="button" class="btn btn-secondary">Seller Sign In</button>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class SellerPage {
  private readonly router = inject(Router);

  protected readonly journeySteps = journeySteps;
  protected readonly faqItems = faqItems;
  protected readonly openFaq = signal<number | null>(null);

  protected form = {
    storeName: '',
    sellerName: '',
    phone: '',
    location: 'Phnom Penh',
    category: 'Hand-woven Silk & Textiles',
  };

  protected readonly joinPoints = [
    'No initial setup fees',
    'Personal account manager',
    'Integrated logistics support',
  ];

  toggleFaq(index: number): void {
    this.openFaq.set(this.openFaq() === index ? null : index);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.startOnboarding();
  }

  protected startOnboarding(): void {
    void this.router.navigateByUrl('/seller/onboarding');
  }
}
