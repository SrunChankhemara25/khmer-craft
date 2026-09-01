import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/ui/kc-icon';

type PlanKey = 'starter' | 'standard' | 'premium';
type PaymentKey = 'aba' | 'stripe' | 'free';

@Component({
  selector: 'app-seller-onboarding',
  imports: [FormsModule, RouterLink, KcIcon],
  styles: [`
    :host {
      background: #f7f8f7;
      color: #242b33;
      display: block;
      min-height: 100vh;
    }

    .onboarding-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .mini-header,
    .header-signin {
      color: #4b7a5f;
      font-size: 12.5px;
      font-weight: 650;
      text-decoration: none;
    }

    .header-signin:hover {
      color: #2f5d45;
      text-decoration: underline;
    }

    .mini-footer {
      background: #fff;
      border-bottom: 1px solid #dfe4e1;
    }

    .header-inner,
    .footer-inner {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin: 0 auto;
      max-width: 1180px;
      padding: 17px 48px;
    }

    .brand {
      color: #151b21;
      font-size: 17px;
      font-weight: 850;
      letter-spacing: -0.01em;
      text-decoration: none;
    }

    .header-icons {
      color: #75807b;
      display: flex;
      gap: 16px;
    }

    main {
      flex: 1;
      min-height: 672px;
    }

    .stepper {
      align-items: flex-start;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      margin: 85px auto 0;
      max-width: 620px;
    }

    .step-pill {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 9px;
      position: relative;
    }

    .step-pill::after {
      background: #dfe4e1;
      content: "";
      height: 1px;
      left: calc(50% + 16px);
      position: absolute;
      right: calc(-50% + 16px);
      top: 11px;
    }

    .step-pill:last-child::after {
      display: none;
    }

    .dot {
      align-items: center;
      background: #eef0ef;
      border: 1px solid #d8dedb;
      border-radius: 50%;
      color: #a5aaa8;
      display: flex;
      font-size: 10px;
      font-weight: 800;
      height: 25px;
      justify-content: center;
      position: relative;
      width: 25px;
      z-index: 1;
    }

    .active .dot,
    .done .dot {
      background: #155f40;
      border-color: #155f40;
      color: #fff;
    }

    .step-pill span {
      color: #7a827e;
      font-size: 10px;
      font-weight: 700;
    }

    .active span {
      color: #155f40;
    }

    .info-screen {
      margin: 91px auto 0;
      max-width: 720px;
      padding: 0 24px;
    }

    .info-screen h1 {
      color: #242b33;
      font-size: 36px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.06;
      margin: 0 0 14px;
    }

    .info-screen > p,
    .plan-head p,
    .success p {
      color: #78817d;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.55;
      margin: 0;
    }

    .form-block {
      margin-top: 49px;
    }

    .block-title {
      border-bottom: 1px solid #dfe4e1;
      color: #242b33;
      display: block;
      font-size: 12px;
      font-weight: 850;
      margin-bottom: 21px;
      padding-bottom: 16px;
    }

    .form-row {
      display: grid;
      gap: 19px;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 18px;
    }

    label {
      color: #6d7672;
      display: block;
      font-size: 10px;
      font-weight: 700;
    }

    input {
      background: #fff;
      border: 1px solid #d9dfdc;
      border-radius: 3px;
      color: #242b33;
      display: block;
      font-size: 11px;
      font-weight: 600;
      height: 35px;
      margin-top: 8px;
      outline: none;
      padding: 0 11px;
      width: 100%;
    }

    input:focus {
      border-color: #155f40;
      box-shadow: 0 0 0 3px rgba(21, 95, 64, 0.08);
    }

    .screen-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 110px;
    }

    .primary-action {
      background: #155f40;
      border: 0;
      border-radius: 3px;
      color: #fff;
      cursor: pointer;
      font-size: 10px;
      font-weight: 850;
      height: 37px;
      min-width: 140px;
      padding: 0 24px;
    }

    .plan-screen {
      margin: 93px auto 0;
      max-width: 960px;
      padding: 0 24px;
      text-align: center;
    }

    .plan-head h1 {
      color: #242b33;
      font-size: 34px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.08;
      margin: 0 0 19px;
    }

    .plans {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(3, 1fr);
      margin-top: 68px;
      text-align: left;
    }

    .plan-card {
      background: #fff;
      border: 1px solid #d9dfdc;
      min-height: 424px;
      padding: 34px 34px 32px;
    }

    .plan-card.selected {
      border-color: #155f40;
      box-shadow: inset 0 0 0 1px #155f40;
    }

    .plan-name {
      color: #7b837f;
      display: block;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: 0.08em;
      margin-bottom: 38px;
      text-transform: uppercase;
    }

    .price {
      align-items: end;
      color: #242b33;
      display: flex;
      font-size: 38px;
      font-weight: 900;
      gap: 4px;
      letter-spacing: -0.03em;
      margin-bottom: 37px;
    }

    .price small {
      color: #7b837f;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .features {
      display: flex;
      flex-direction: column;
      gap: 17px;
      list-style: none;
      margin: 0 0 46px;
      padding: 0;
    }

    .features li {
      align-items: center;
      color: #59635f;
      display: flex;
      font-size: 11px;
      font-weight: 650;
      gap: 9px;
    }

    .features kc-icon {
      color: #6ca987;
    }

    .select-btn {
      background: #fff;
      border: 1px solid #d9dfdc;
      border-radius: 0;
      color: #242b33;
      cursor: pointer;
      font-size: 10px;
      font-weight: 850;
      height: 39px;
      width: 100%;
    }

    .selected .select-btn {
      background: #155f40;
      border-color: #155f40;
      color: #fff;
    }

    .stats-band {
      border-top: 1px solid #dfe4e1;
      margin-top: 90px;
      padding: 52px 0 107px;
    }

    .stats-inner {
      align-items: start;
      display: grid;
      grid-template-columns: 1fr auto auto;
      margin: 0 auto;
      max-width: 960px;
      padding: 0 24px;
    }

    .stats-inner h2 {
      color: #242b33;
      font-size: 14px;
      font-weight: 850;
      margin: 0 0 11px;
    }

    .stats-inner p {
      color: #6f7975;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.45;
      margin: 0;
      max-width: 420px;
    }

    .stat {
      color: #242b33;
      font-size: 27px;
      font-weight: 900;
      line-height: 1;
      min-width: 126px;
      text-align: left;
    }

    .stat small {
      color: #6f7975;
      display: block;
      font-size: 10px;
      font-weight: 850;
      margin-top: 8px;
      text-transform: uppercase;
    }

    .payment-screen {
      display: grid;
      gap: 44px;
      grid-template-columns: 1fr 355px;
      margin: 65px auto 0;
      max-width: 950px;
      padding: 0 24px;
    }

    .payment-screen h1 {
      color: #242b33;
      font-size: 23px;
      font-weight: 900;
      margin: 0 0 29px;
    }

    .payment-option {
      align-items: center;
      background: #fff;
      border: 1px solid #d9dfdc;
      border-radius: 4px;
      color: #242b33;
      cursor: pointer;
      display: flex;
      font-size: 13px;
      font-weight: 800;
      height: 58px;
      justify-content: space-between;
      margin-bottom: 14px;
      padding: 0 20px;
      width: 100%;
    }

    .payment-option.selected {
      border-color: #155f40;
      box-shadow: inset 0 0 0 1px #155f40;
    }

    .option-left {
      align-items: center;
      display: flex;
      gap: 12px;
    }

    .radio {
      border: 1px solid #b8c1bd;
      border-radius: 50%;
      height: 12px;
      position: relative;
      width: 12px;
    }

    .selected .radio {
      border-color: #155f40;
    }

    .selected .radio::after {
      background: #155f40;
      border-radius: 50%;
      content: "";
      height: 6px;
      left: 2px;
      position: absolute;
      top: 2px;
      width: 6px;
    }

    .tag {
      background: #f1f3f2;
      border-radius: 2px;
      color: #9aa19e;
      font-size: 9px;
      font-weight: 850;
      padding: 4px 7px;
      text-transform: uppercase;
    }

    .selected .tag {
      background: transparent;
      color: #155f40;
    }

    .summary {
      background: #fff;
      border: 1px solid #d9dfdc;
      border-radius: 4px;
      min-height: 317px;
      padding: 28px 30px;
    }

    .summary h2 {
      color: #242b33;
      font-size: 13px;
      font-weight: 850;
      margin: 0 0 30px;
    }

    .line {
      align-items: center;
      color: #717a76;
      display: flex;
      font-size: 11px;
      font-weight: 650;
      justify-content: space-between;
      margin-bottom: 18px;
    }

    .discount {
      color: #b64a4a;
    }

    .total {
      align-items: center;
      border-top: 1px solid #e6ebe8;
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 24px;
    }

    .total span:first-child {
      color: #242b33;
      font-size: 12px;
      font-weight: 850;
    }

    .total strong {
      color: #242b33;
      font-size: 28px;
      font-weight: 900;
    }

    .summary .primary-action {
      margin-top: 30px;
      width: 100%;
    }

    .terms {
      color: #a0a8a4;
      font-size: 9px;
      font-weight: 650;
      line-height: 1.5;
      margin: 15px 0 0;
      text-align: center;
    }

    .success {
      align-items: center;
      background:
        radial-gradient(circle at 50% 39%, rgba(184, 235, 204, 0.42), rgba(184, 235, 204, 0) 32%),
        #fff;
      display: flex;
      flex: 1;
      justify-content: center;
      min-height: 680px;
      padding: 0 24px;
      text-align: center;
    }

    .success-icon {
      align-items: center;
      background: rgba(238, 247, 241, 0.82);
      border: 1px solid #d6eee0;
      border-radius: 50%;
      box-shadow: 0 20px 60px rgba(21, 95, 64, 0.15);
      color: #2d7654;
      display: flex;
      height: 80px;
      justify-content: center;
      margin: 0 auto 63px;
      width: 80px;
    }

    .success h1 {
      color: #242b33;
      font-size: 31px;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin: 0 0 14px;
    }

    .success p {
      margin: 0 auto 42px;
      max-width: 470px;
    }

    .success-actions {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .success-actions .btn {
      min-width: 168px;
      padding: 13px 18px;
    }

    .mini-footer {
      border-bottom: 0;
      border-top: 1px solid #dfe4e1;
    }

    .footer-inner {
      color: #a1a9a5;
      font-size: 10px;
      font-weight: 650;
      min-height: 85px;
    }

    .footer-links {
      display: flex;
      gap: 28px;
    }

    .footer-links a {
      color: #8c9691;
      text-decoration: none;
    }

    @media (max-width: 820px) {
      .header-inner,
      .footer-inner {
        padding: 17px 24px;
      }

      .stepper {
        margin-top: 48px;
      }

      .plans,
      .payment-screen,
      .stats-inner {
        grid-template-columns: 1fr;
      }

      .stats-inner {
        gap: 28px;
      }

      .footer-inner {
        align-items: flex-start;
        flex-direction: column;
        gap: 18px;
      }
    }

    @media (max-width: 560px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .info-screen h1,
      .plan-head h1 {
        font-size: 30px;
      }

      .screen-actions {
        margin-top: 58px;
      }
    }
  `],
  template: `
    <div class="onboarding-shell">
      <header class="mini-header">
        <div class="header-inner">
          <a class="brand" routerLink="/">KhmerCraft</a>
          <a class="header-signin" routerLink="/seller/login">Already selling? Sign in</a>
        </div>
      </header>

      @if (step() !== 4) {
        <main>
          @if (step() !== 2) {
            <div class="stepper" aria-label="Seller onboarding progress">
              @for (item of progress; track item.label) {
                <div class="step-pill" [class.active]="step() === item.step" [class.done]="step() > item.step">
                  <div class="dot">{{ item.step }}</div>
                  <span>{{ item.label }}</span>
                </div>
              }
            </div>
          }

          @if (step() === 1) {
            <section class="info-screen">
              <h1>Start your journey.</h1>
              <p>
                Tell us about yourself and your craft. This information will help us set up your
                professional digital storefront.
              </p>

              <form class="form-block" (submit)="goTo(2); $event.preventDefault()">
                <span class="block-title">Account</span>
                <div class="form-row">
                  <label>
                    First Name
                    <input type="text" [(ngModel)]="form.firstName" name="firstName" placeholder="Enter first name" />
                  </label>
                  <label>
                    Last Name
                    <input type="text" [(ngModel)]="form.lastName" name="lastName" placeholder="Enter last name" />
                  </label>
                </div>
                <label>
                  Email Address
                  <input type="email" [(ngModel)]="form.email" name="email" placeholder="email@example.com" />
                </label>
                <div class="screen-actions">
                  <button type="submit" class="primary-action">Continue</button>
                </div>
              </form>
            </section>
          }

          @if (step() === 2) {
            <section class="plan-screen">
              <div class="plan-head">
                <h1>Choose your path</h1>
                <p>
                  Select a plan that fits the scale of your craftsmanship. No hidden fees.<br />
                  Transparent growth.
                </p>
              </div>

              <div class="plans">
                @for (plan of plans; track plan.key) {
                  <article class="plan-card" [class.selected]="selectedPlan() === plan.key">
                    <span class="plan-name">{{ plan.name }}</span>
                    <div class="price">{{ plan.price }}<small>/mo</small></div>
                    <ul class="features">
                      @for (feature of plan.features; track feature) {
                        <li><kc-icon name="check" [size]="12" /> {{ feature }}</li>
                      }
                    </ul>
                    <button type="button" class="select-btn" (click)="selectPlan(plan.key)">Select</button>
                  </article>
                }
              </div>
            </section>

            <section class="stats-band">
              <div class="stats-inner">
                <div>
                  <h2>Precision Crafting</h2>
                  <p>
                    Our platform is built for artisans who value quality over quantity. Every plan
                    includes our core marketplace features with zero transaction commission.
                  </p>
                </div>
                <div class="stat">12k+<small>Active Artisans</small></div>
                <div class="stat">0%<small>Fees</small></div>
              </div>
            </section>
          }

          @if (step() === 3) {
            <section class="payment-screen">
              <div>
                <h1>Payment Method</h1>
                @for (payment of payments; track payment.key) {
                  <button
                    type="button"
                    class="payment-option"
                    [class.selected]="selectedPayment() === payment.key"
                    (click)="selectedPayment.set(payment.key)"
                  >
                    <span class="option-left"><span class="radio"></span>{{ payment.label }}</span>
                    <span class="tag">{{ payment.tag }}</span>
                  </button>
                }
              </div>

              <aside class="summary">
                <h2>Summary</h2>
                <div class="line"><span>Onboarding Fee</span><span>$49.00</span></div>
                <div class="line"><span>Platform Setup</span><span>$20.00</span></div>
                <div class="line discount"><span>Discount</span><span>-$69.00</span></div>
                <div class="total">
                  <span>Total</span>
                  <strong>$0.00</strong>
                </div>
                <button type="button" class="primary-action" (click)="goTo(4)">Complete</button>
                <p class="terms">By clicking Complete, you agree to KhmerCraft Terms.</p>
              </aside>
            </section>
          }
        </main>
      } @else {
        <main class="success">
          <section>
            <div class="success-icon"><kc-icon name="check" [size]="44" /></div>
            <h1>Your store is ready.</h1>
            <p>
              Manage your products from the dashboard. Your journey as a master artisan on
              KhmerCraft begins today.
            </p>
            <div class="success-actions">
              <a class="btn btn-primary" routerLink="/seller/dashboard">Go to Dashboard</a>
              <a class="btn btn-secondary" routerLink="/">View Store</a>
            </div>
          </section>
        </main>
      }

      <footer class="mini-footer">
        <div class="footer-inner">
          <strong>KhmerCraft</strong>
          <nav class="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Shipping</a>
            <a href="#">Contact</a>
          </nav>
          <span>&copy; 2024 KhmerCraft. Artisan excellence.</span>
        </div>
      </footer>
    </div>
  `,
})
export class SellerOnboardingPage {
  protected readonly step = signal(1);
  protected readonly selectedPlan = signal<PlanKey>('standard');
  protected readonly selectedPayment = signal<PaymentKey>('free');

  protected form = {
    firstName: '',
    lastName: '',
    email: '',
  };

  protected readonly progress = [
    { step: 1, label: 'Info' },
    { step: 2, label: 'Plan' },
    { step: 3, label: 'Payment' },
  ];

  protected readonly plans: Array<{
    key: PlanKey;
    name: string;
    price: string;
    features: string[];
  }> = [
    {
      key: 'starter',
      name: 'Starter',
      price: '$0',
      features: ['Up to 10 active listings', 'Standard dashboard', 'Community support'],
    },
    {
      key: 'standard',
      name: 'Standard',
      price: '$29',
      features: ['Unlimited listings', 'Advanced analytics tools', 'Priority email support', 'Custom storefront URL'],
    },
    {
      key: 'premium',
      name: 'Premium',
      price: '$89',
      features: ['Everything in Standard', 'Dedicated account manager', 'Exclusive artisan features', 'API access & integrations'],
    },
  ];

  protected readonly payments: Array<{ key: PaymentKey; label: string; tag: string }> = [
    { key: 'aba', label: 'ABA', tag: 'Pay' },
    { key: 'stripe', label: 'Stripe', tag: 'Visa' },
    { key: 'free', label: 'Free', tag: '$0.00' },
  ];

  protected goTo(step: number): void {
    this.step.set(step);
  }

  protected selectPlan(plan: PlanKey): void {
    this.selectedPlan.set(plan);
    this.step.set(3);
  }
}
