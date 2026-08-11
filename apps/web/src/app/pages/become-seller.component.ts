import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-become-seller',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar></app-navbar>

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-copy animate-in">
        <span class="badge badge-soft"><ui-icon name="store" [size]="13"></ui-icon> For Artisans &amp; Producers</span>
        <h1>Turn your craft into a thriving business</h1>
        <p>Join 1,200+ Cambodian sellers reaching customers across the country and around the world. No listing fees, transparent payouts, full support.</p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg">Start Selling Now <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>
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

  <section class="container pricing-section">
    <div class="section-head-center">
      <h2>Simple, transparent pricing</h2>
      <p>No hidden fees. You only pay when you make a sale.</p>
    </div>
    <div class="pricing-grid">
      <div class="pricing-card">
        <span class="badge badge-neutral">Standard</span>
        <div class="pricing-amount">8%<small>/ per sale</small></div>
        <ul>
          <li><ui-icon name="check" [size]="14" color="var(--color-accent)"></ui-icon> Unlimited product listings</li>
          <li><ui-icon name="check" [size]="14" color="var(--color-accent)"></ui-icon> Weekly payouts</li>
          <li><ui-icon name="check" [size]="14" color="var(--color-accent)"></ui-icon> Basic storefront customization</li>
          <li><ui-icon name="check" [size]="14" color="var(--color-accent)"></ui-icon> Standard support</li>
        </ul>
        <button class="btn btn-outline btn-block">Choose Standard</button>
      </div>
      <div class="pricing-card featured">
        <span class="badge badge-gold">Most Popular</span>
        <div class="pricing-amount">5%<small>/ per sale</small></div>
        <ul>
          <li><ui-icon name="check" [size]="14" color="#fff"></ui-icon> Everything in Standard</li>
          <li><ui-icon name="check" [size]="14" color="#fff"></ui-icon> Featured placement in category pages</li>
          <li><ui-icon name="check" [size]="14" color="#fff"></ui-icon> Priority payouts (2 days)</li>
          <li><ui-icon name="check" [size]="14" color="#fff"></ui-icon> Dedicated seller success manager</li>
        </ul>
        <button class="btn btn-primary btn-block">Choose Growth</button>
      </div>
    </div>
  </section>

  <section class="container form-section">
    <div class="form-card">
      <div class="section-head-center">
        <h2>Apply to become a seller</h2>
        <p>Tell us a bit about your craft — we'll be in touch within 2 business days.</p>
      </div>
      <form class="apply-form">
        <div class="form-grid">
          <div class="field">
            <label>Full Name</label>
            <input type="text" placeholder="Your name">
          </div>
          <div class="field">
            <label>Phone Number</label>
            <input type="text" placeholder="+855 00 000 000">
          </div>
          <div class="field span-2">
            <label>Email Address</label>
            <div class="input-icon-wrap">
              <ui-icon name="mail" [size]="16"></ui-icon>
              <input type="email" placeholder="you@example.com">
            </div>
          </div>
          <div class="field">
            <label>Business / Shop Name</label>
            <input type="text" placeholder="E.g. Srey Khmer Handmade">
          </div>
          <div class="field">
            <label>Product Category</label>
            <select>
              <option>Handmade Crafts</option>
              <option>Pottery</option>
              <option>Weaving</option>
              <option>Local Food</option>
              <option>Other</option>
            </select>
          </div>
          <div class="field span-2">
            <label>Tell us about your products <span class="optional">(optional)</span></label>
            <textarea rows="4" placeholder="What do you make, and where are you based?"></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-block">Submit Application <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>
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

    .stats-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; padding: 44px 32px; text-align: center; }
    .stat strong { font-size: 28px; font-family: var(--font-heading); display: block; color: var(--color-accent); }
    .stat small { color: var(--color-muted); font-size: 12.5px; }

    .section-head-center { text-align: center; margin-bottom: 36px; }
    .section-head-center h2 { font-size: 26px; margin-bottom: 8px; }
    .section-head-center p { color: var(--color-muted); font-size: 14px; }

    .why-section { padding: 20px 32px 56px; }
    .why-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; }
    .why-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; text-align: center; background: #fff; transition: all var(--dur-base) var(--ease-standard); }
    .why-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-sm); }
    .why-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
    .why-card strong { display: block; font-size: 14.5px; margin-bottom: 6px; }
    .why-card small { color: var(--color-muted); font-size: 12.5px; line-height: 1.5; }

    .steps-section { padding: 20px 32px 56px; background: var(--color-bg-alt); border-radius: var(--radius-lg); margin: 0 32px 56px; padding-top: 44px; padding-bottom: 44px; }
    .steps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 20px; }
    .step-card { background: #fff; border-radius: var(--radius-md); padding: 22px; position: relative; }
    .step-num { position: absolute; top: 16px; right: 16px; font-size: 12px; font-weight: 700; color: var(--color-muted-2); }
    .step-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
    .step-card strong { display: block; font-size: 14px; margin-bottom: 6px; }
    .step-card small { color: var(--color-muted); font-size: 12.5px; line-height: 1.5; }

    .pricing-section { padding: 20px 32px 56px; }
    .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 780px; margin: 0 auto; }
    .pricing-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 28px; background: #fff; }
    .pricing-card.featured { background: linear-gradient(135deg, #3a5a45, #22362a); color: #fff; border-color: #22362a; }
    .pricing-amount { font-size: 40px; font-weight: 800; font-family: var(--font-heading); margin: 18px 0 20px; }
    .pricing-amount small { font-size: 13px; font-weight: 500; color: var(--color-muted); }
    .pricing-card.featured .pricing-amount small { color: rgba(255,255,255,0.6); }
    .pricing-card ul { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 12px; }
    .pricing-card li { display: flex; align-items: center; gap: 9px; font-size: 13.5px; }

    .form-section { padding: 20px 32px 60px; }
    .form-card { max-width: 720px; margin: 0 auto; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 40px; background: #fff; }
    .apply-form .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
    .span-2 { grid-column: span 2; }
    .optional { font-weight: 400; color: var(--color-muted); }
    .apply-form textarea { width: 100%; padding: 11px 14px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); font-size: 14px; resize: vertical; font-family: var(--font-body); }
    .form-note { text-align: center; font-size: 12px; color: var(--color-muted); margin-top: 14px; }

    @media (max-width: 980px) {
      .hero-inner, .pricing-grid { grid-template-columns: 1fr; }
      .stats-row, .why-grid, .steps-grid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
      .apply-form .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }
  `]
})
export class BecomeSellerComponent {
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
}
