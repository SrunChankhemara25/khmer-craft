import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KcIcon } from '../../../components/ui/kc-icon';
import { FooterComponent } from '../../../shared/footer.component';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { faqItems, journeySteps } from '../../../core/data/seller-content.data';

@Component({
  selector: 'app-seller',
  imports: [FormsModule, KcIcon, SellerPortalHeader, FooterComponent],
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

    .intro-band {
      background: #fafbf8;
      padding: 86px 24px 52px;
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

    .trust-strip {
      background: #173d2e;
      color: #fff;
      padding: 26px 0;
    }

    .trust-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      text-align: center;
    }

    .trust-grid strong { display: block; font-size: 24px; margin-bottom: 4px; }
    .trust-grid span { color: rgba(255,255,255,.68); font-size: 11px; font-weight: 700; }

    .about-platform { padding: 36px 0 92px; }
    .platform-grid { display: grid; grid-template-columns: .85fr 1.15fr; gap: 72px; align-items: center; }
    .platform-copy .eyebrow { margin-bottom: 12px; }
    .platform-copy h2 { color: #202833; font-size: 37px; line-height: 1.14; margin: 0 0 20px; }
    .platform-copy p { color: #68736f; font-size: 14px; line-height: 1.75; margin: 0 0 16px; }
    .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .feature-card { background: #fff; border: 1px solid #e1e7df; border-radius: 12px; padding: 22px; }
    .feature-icon { align-items: center; background: #eef7f1; border-radius: 10px; color: #176242; display: flex; height: 40px; justify-content: center; margin-bottom: 15px; width: 40px; }
    .feature-card h3 { font-size: 14px; margin: 0 0 7px; }
    .feature-card p { color: #68736f; font-size: 11.5px; line-height: 1.55; margin: 0; }

    .categories-section { background: #f3f6f1; padding: 86px 0; }
    .section-heading { display: flex; justify-content: space-between; gap: 32px; align-items: end; margin-bottom: 36px; }
    .section-heading p { color: #68736f; font-size: 13px; line-height: 1.6; margin: 0; max-width: 500px; }
    .category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .category-card { background: #fff; border: 1px solid #e1e7df; border-radius: 12px; padding: 25px; }
    .category-card span { color: #176242; font-size: 11px; font-weight: 850; }
    .category-card h3 { font-size: 17px; margin: 8px 0; }
    .category-card p { color: #68736f; font-size: 11.5px; line-height: 1.55; margin: 0; }

    .pricing-section { padding: 92px 0; }
    .pricing-head { margin-bottom: 40px; text-align: center; }
    .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 0 auto; max-width: 980px; }
    .price-card { background: #fff; border: 1px solid #dfe6de; border-radius: 14px; padding: 30px; position: relative; }
    .price-card.featured { border: 2px solid #176242; box-shadow: 0 16px 40px rgba(23,98,66,.12); }
    .popular { background: #176242; border-radius: 20px; color: white; font-size: 9px; font-weight: 850; padding: 7px 12px; position: absolute; right: 18px; top: 18px; text-transform: uppercase; }
    .price-card h3 { font-size: 20px; margin: 0 0 8px; }
    .price { color: #176242; font-size: 30px; font-weight: 850; margin: 18px 0; }
    .price small { color: #68736f; font-size: 11px; font-weight: 650; }
    .price-card p { color: #68736f; font-size: 12px; line-height: 1.5; }
    .price-card ul { border-top: 1px solid #edf0ec; list-style: none; margin: 22px 0 0; padding: 18px 0 0; }
    .price-card li { color: #46534f; font-size: 11.5px; margin: 11px 0; }
    .price-card li::before { color: #176242; content: '✓'; font-weight: 900; margin-right: 9px; }

    .seller-tools { background: #173d2e; color: #fff; padding: 88px 0; }
    .tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 70px; align-items: center; }
    .tools-copy h2 { color: #fff; font-size: 36px; margin: 0 0 18px; }
    .tools-copy > p { color: rgba(255,255,255,.7); font-size: 13px; line-height: 1.7; }
    .tool-list { display: grid; gap: 13px; margin-top: 27px; }
    .tool-item { align-items: start; display: flex; gap: 12px; }
    .tool-item strong { display: block; font-size: 13px; margin-bottom: 3px; }
    .tool-item span { color: rgba(255,255,255,.63); font-size: 11px; line-height: 1.5; }
    .dashboard-preview { background: #f8f4ec; border-radius: 16px; box-shadow: 0 24px 55px rgba(0,0,0,.25); color: #243129; padding: 24px; transform: rotate(1deg); }
    .preview-top { align-items: center; display: flex; justify-content: space-between; margin-bottom: 20px; }
    .preview-top strong { font-size: 14px; }
    .preview-pill { background: #dff1e5; border-radius: 20px; color: #176242; font-size: 9px; font-weight: 800; padding: 6px 10px; }
    .preview-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .preview-stat { background: white; border-radius: 9px; padding: 15px; }
    .preview-stat small { color: #768079; display: block; font-size: 9px; }
    .preview-stat strong { display: block; font-size: 18px; margin-top: 8px; }
    .preview-chart { align-items: end; background: white; border-radius: 9px; display: flex; gap: 8px; height: 130px; margin-top: 12px; padding: 18px; }
    .preview-chart span { background: #8dbca0; border-radius: 4px 4px 0 0; flex: 1; }

    .proof-section { padding: 88px 0; }
    .proof-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 38px; }
    .quote-card { background: #fff; border: 1px solid #e1e7df; border-radius: 12px; padding: 27px; }
    .quote-card blockquote { color: #3f4b46; font-size: 13px; line-height: 1.7; margin: 0 0 22px; }
    .maker { align-items: center; display: flex; gap: 12px; }
    .maker-avatar { align-items: center; background: #dcebe1; border-radius: 50%; color: #176242; display: flex; font-size: 12px; font-weight: 850; height: 38px; justify-content: center; width: 38px; }
    .maker strong, .maker span { display: block; }
    .maker strong { font-size: 11.5px; }
    .maker span { color: #7b8580; font-size: 10px; margin-top: 3px; }

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
      .join-card,
      .platform-grid,
      .tools-grid {
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

      .trust-grid, .category-grid, .pricing-grid, .proof-grid { grid-template-columns: repeat(2, 1fr); }

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

      .hero-image {
        height: 300px;
      }

      .verified-badge {
        left: 14px;
      }

      .steps-grid,
      .form-row,
      .trust-grid,
      .feature-grid,
      .category-grid,
      .pricing-grid,
      .proof-grid,
      .preview-stats {
        grid-template-columns: 1fr;
      }

      .section-heading { align-items: start; flex-direction: column; }

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
    <app-seller-portal-header />

    <section id="why-sell" class="hero">
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
              <a class="btn btn-secondary" href="http://localhost:4200" target="_blank" rel="noopener">Explore Marketplace</a>
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

    <section class="trust-strip" aria-label="KhmerCraft marketplace highlights">
      <div class="seller-container trust-grid">
        <div><strong>2,500+</strong><span>Cambodian makers</span></div>
        <div><strong>25</strong><span>Provinces represented</span></div>
        <div><strong>0%</strong><span>Listing fees</span></div>
        <div><strong>24/7</strong><span>Storefront availability</span></div>
      </div>
    </section>

    <section class="intro-band">
      <span class="eyebrow">Built for Cambodian makers</span>
      <h2 class="section-title">More than a marketplace—your digital business partner</h2>
      <p class="section-copy">KhmerCraft connects authentic Cambodian products with customers who value origin, quality, and the people behind every piece.</p>
    </section>

    <section class="about-platform">
      <div class="seller-container platform-grid">
        <div class="platform-copy">
          <span class="eyebrow">What is KhmerCraft?</span>
          <h2>A trusted home for Cambodia's creative economy</h2>
          <p>KhmerCraft is a curated commerce platform for artisans, workshops, cooperatives, and local brands. We help you present your story professionally, sell online, manage orders, and reach customers beyond your neighborhood.</p>
          <p>You keep ownership of your products and brand. We provide the technology, marketplace visibility, seller tools, and practical support needed to grow sustainably.</p>
        </div>
        <div class="feature-grid">
          @for (feature of platformFeatures; track feature.title) {
            <article class="feature-card">
              <div class="feature-icon"><kc-icon [name]="feature.icon" [size]="20" /></div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="categories-section">
      <div class="seller-container">
        <div class="section-heading">
          <div><span class="eyebrow">Who can sell</span><h2 class="section-title">Made locally. Shared globally.</h2></div>
          <p>We welcome verified Cambodian makers and responsible local businesses with original, high-quality products and a clear story of origin.</p>
        </div>
        <div class="category-grid">
          @for (category of sellerCategories; track category.title) {
            <article class="category-card">
              <span>{{ category.number }}</span>
              <h3>{{ category.title }}</h3>
              <p>{{ category.description }}</p>
            </article>
          }
        </div>
      </div>
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

    <section id="pricing" class="pricing-section">
      <div class="seller-container">
        <div class="pricing-head">
          <span class="eyebrow">Simple, transparent pricing</span>
          <h2 class="section-title">Start free. Upgrade when your business grows.</h2>
          <p class="section-copy">No listing fees and no surprise setup costs. Choose the support level that fits your store.</p>
        </div>
        <div class="pricing-grid">
          @for (plan of pricingPlans; track plan.name) {
            <article class="price-card" [class.featured]="plan.featured">
              @if (plan.featured) { <span class="popular">Most popular</span> }
              <h3>{{ plan.name }}</h3>
              <p>{{ plan.description }}</p>
              <div class="price">{{ plan.price }} <small>/ month</small></div>
              <button type="button" class="btn btn-primary" (click)="startOnboarding()">Choose {{ plan.name }}</button>
              <ul>@for (item of plan.features; track item) { <li>{{ item }}</li> }</ul>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="seller-tools">
      <div class="seller-container tools-grid">
        <div class="tools-copy">
          <span class="eyebrow" style="color:#9bd6b2">Everything in one place</span>
          <h2>Run your store with confidence</h2>
          <p>Your seller dashboard gives you a clear view of products, orders, revenue, customers, and store performance—without complicated software.</p>
          <div class="tool-list">
            @for (tool of sellerTools; track tool.title) {
              <div class="tool-item"><kc-icon name="check" [size]="16" /><div><strong>{{ tool.title }}</strong><span>{{ tool.description }}</span></div></div>
            }
          </div>
        </div>
        <div class="dashboard-preview" aria-label="Seller dashboard preview">
          <div class="preview-top"><strong>Your store overview</strong><span class="preview-pill">Store active</span></div>
          <div class="preview-stats">
            <div class="preview-stat"><small>This month</small><strong>$1,284</strong></div>
            <div class="preview-stat"><small>Orders</small><strong>48</strong></div>
            <div class="preview-stat"><small>Rating</small><strong>4.9</strong></div>
          </div>
          <div class="preview-chart" aria-hidden="true"><span style="height:35%"></span><span style="height:52%"></span><span style="height:43%"></span><span style="height:70%"></span><span style="height:60%"></span><span style="height:88%"></span><span style="height:100%"></span></div>
        </div>
      </div>
    </section>

    <section class="proof-section">
      <div class="seller-container">
        <div class="pricing-head"><span class="eyebrow">Seller stories</span><h2 class="section-title">Growth that strengthens communities</h2><p class="section-copy">When local businesses grow, skills are preserved, jobs are created, and Cambodian stories travel further.</p></div>
        <div class="proof-grid">
          @for (story of sellerStories; track story.name) {
            <article class="quote-card"><blockquote>“{{ story.quote }}”</blockquote><div class="maker"><div class="maker-avatar">{{ story.initials }}</div><div><strong>{{ story.name }}</strong><span>{{ story.business }}</span></div></div></article>
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

    <app-footer />
  `,
})
export class SellerPage {
  private readonly router = inject(Router);

  protected readonly journeySteps = journeySteps;
  protected readonly faqItems = faqItems;
  protected readonly openFaq = signal<number | null>(null);

  protected readonly platformFeatures = [
    { icon: 'store', title: 'Your own digital storefront', description: 'Showcase products, your workshop, and the cultural story behind your craft.' },
    { icon: 'users', title: 'Reach new customers', description: 'Be discovered by local and international shoppers seeking authentic Cambodian goods.' },
    { icon: 'chart', title: 'Simple business tools', description: 'Manage listings, inventory, orders, reviews, and performance from one dashboard.' },
    { icon: 'shield', title: 'Trust and verification', description: 'Build buyer confidence through seller verification, secure checkout, and ratings.' },
  ];

  protected readonly sellerCategories = [
    { number: '01', title: 'Textiles & fashion', description: 'Handwoven silk, krama, natural-dye clothing, bags, and responsible accessories.' },
    { number: '02', title: 'Home & living', description: 'Pottery, baskets, woodwork, décor, furniture, candles, and useful handmade objects.' },
    { number: '03', title: 'Jewelry & gifts', description: 'Silverwork, jewelry, keepsakes, stationery, and meaningful Cambodian gifts.' },
    { number: '04', title: 'Food & wellness', description: 'Palm sugar, spices, tea, specialty foods, natural skincare, and wellness products.' },
    { number: '05', title: 'Art & heritage', description: 'Painting, sculpture, lacquerware, musical instruments, and heritage-inspired work.' },
    { number: '06', title: 'Local brands', description: 'Thoughtful Cambodian products with responsible sourcing and local production.' },
  ];

  protected readonly pricingPlans = [
    { name: 'Starter', price: '$0', description: 'For new makers beginning their online journey.', featured: false, features: ['Up to 10 active products', 'Standard storefront', 'Order management', 'Email support'] },
    { name: 'Growth', price: '$12', description: 'For active sellers ready to reach more customers.', featured: true, features: ['Unlimited products', 'Sales analytics', 'Promotion tools', 'Priority seller support'] },
    { name: 'Professional', price: '$29', description: 'For established workshops and growing brands.', featured: false, features: ['Everything in Growth', 'Team access', 'Featured campaigns', 'Dedicated account support'] },
  ];

  protected readonly sellerTools = [
    { title: 'Products and inventory', description: 'Create listings, organize categories, update stock, and keep product details accurate.' },
    { title: 'Orders and delivery', description: 'Accept orders, prepare shipments, update status, and keep customers informed.' },
    { title: 'Performance insights', description: 'Understand revenue, popular products, conversion, and customer feedback.' },
    { title: 'Human seller support', description: 'Get practical guidance from onboarding through your next stage of growth.' },
  ];

  protected readonly sellerStories = [
    { initials: 'SR', name: 'Sophea Rath', business: 'Silk weaver · Takeo', quote: 'KhmerCraft helped customers understand the time and skill behind every scarf, not just see a product photo.' },
    { initials: 'DV', name: 'Dara Vann', business: 'Ceramic studio · Kampong Chhnang', quote: 'The dashboard makes orders easy to follow, so I can spend more time making and less time checking messages.' },
    { initials: 'ML', name: 'Malis Lim', business: 'Natural goods · Siem Reap', quote: 'Our small workshop now reaches buyers outside our province while keeping our identity and story visible.' },
  ];

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
