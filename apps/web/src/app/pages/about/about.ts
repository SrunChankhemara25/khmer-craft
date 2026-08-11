import { Component } from '@angular/core';
import { KcIcon } from '../../components/ui/kc-icon';

@Component({
  selector: 'app-about',
  imports: [KcIcon],
  styles: [`
    :host {
      background: #fafbf8;
      color: #2a332f;
      display: block;
    }

    .about-container {
      max-width: 1210px;
      margin: 0 auto;
      padding: 0 70px;
    }

    .hero {
      padding: 36px 0 53px;
    }

    .breadcrumb {
      color: #68736f;
      font-size: 11px;
      font-weight: 700;
      margin: 0 0 142px;
    }

    .breadcrumb span {
      color: #176242;
    }

    .hero-grid {
      align-items: center;
      display: grid;
      gap: 72px;
      grid-template-columns: 1fr 0.76fr;
    }

    .eyebrow {
      color: #176242;
      display: block;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 27px;
    }

    .hero-copy {
      color: #65706b;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.55;
      margin: 0 0 24px;
      max-width: 594px;
    }

    .actions {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }

    .btn {
      border-radius: 5px;
      cursor: pointer;
      display: inline-block;
      font-size: 12px;
      font-weight: 800;
      min-width: 165px;
      padding: 14px 22px;
      text-align: center;
      text-decoration: none;
    }

    .btn-primary {
      background: #176242;
      border: 1px solid #176242;
      color: #fff;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid #176242;
      color: #176242;
    }

    .hero-photo {
      position: relative;
    }

    .hero-photo img {
      border-radius: 8px;
      box-shadow: 0 18px 34px rgba(25, 37, 30, 0.18);
      display: block;
      height: 409px;
      object-fit: cover;
      width: 100%;
    }

    .joined-badge {
      background: #fff;
      border-radius: 6px;
      bottom: -26px;
      box-shadow: 0 11px 28px rgba(20, 30, 25, 0.16);
      left: -21px;
      padding: 16px 20px;
      position: absolute;
    }

    .joined-badge strong {
      color: #6cb389;
      display: block;
      font-size: 16px;
      font-weight: 900;
      line-height: 1;
    }

    .joined-badge span {
      color: #73807a;
      display: block;
      font-size: 11px;
      font-weight: 800;
      margin-top: 6px;
    }

    .heritage {
      background: #f3f6f1;
      padding: 24px 0 22px;
    }

    .heritage-grid {
      align-items: stretch;
      display: grid;
      gap: 29px;
      grid-template-columns: 1fr 1fr;
    }

    .story-card {
      background: #fafbf8;
      border-radius: 12px;
      padding: 61px 45px 54px;
    }

    .story-card .eyebrow {
      color: #a17d62;
      letter-spacing: 0.08em;
      margin-bottom: 18px;
      text-transform: uppercase;
    }

    .story-card h2 {
      color: #176242;
      font-size: 14px;
      font-weight: 850;
      margin: 0 0 23px;
    }

    .story-card p {
      color: #65706b;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.75;
      margin: 0;
    }

    .mission-stack {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .mission-card {
      border-radius: 12px;
      min-height: 174px;
      padding: 34px 36px;
    }

    .mission-card.dark {
      background: #2d7654;
      color: #dceee2;
    }

    .mission-card.light {
      background: #b8ebcc;
      color: #39745b;
    }

    .mission-title {
      align-items: center;
      display: flex;
      font-size: 13px;
      font-weight: 850;
      gap: 14px;
      margin-bottom: 22px;
    }

    .mission-card p {
      font-size: 12px;
      font-weight: 650;
      line-height: 1.55;
      margin: 0;
      max-width: 438px;
    }

    .core {
      padding: 117px 0 110px;
    }

    .section-title {
      color: #176242;
      font-size: 13px;
      font-weight: 850;
      margin: 0 0 63px;
      text-align: center;
    }

    .core-grid {
      display: grid;
      gap: 38px;
      grid-template-columns: repeat(3, 1fr);
    }

    .core-card {
      background: #fff;
      border: 1px solid #e8ede7;
      border-radius: 8px;
      min-height: 275px;
      padding: 41px 32px;
      text-align: center;
    }

    .icon-pill {
      align-items: center;
      background: #eef7f1;
      border-radius: 50%;
      color: #176242;
      display: flex;
      height: 54px;
      justify-content: center;
      margin: 0 auto 35px;
      width: 54px;
    }

    .core-card:nth-child(3) .icon-pill {
      background: #f4eee9;
      color: #8d684d;
    }

    .core-card h3 {
      color: #4a5450;
      font-size: 13px;
      font-weight: 850;
      margin: 0 0 21px;
    }

    .core-card p {
      color: #6b756f;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.52;
      margin: 0;
    }

    .process {
      background: #f3f6f1;
      padding: 23px 0 20px;
    }

    .process-head {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      margin-bottom: 46px;
    }

    .process-head .eyebrow {
      color: #459079;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
      text-transform: uppercase;
    }

    .process-head h2 {
      color: #2a332f;
      font-size: 13px;
      font-weight: 850;
      margin: 0;
    }

    .process-head p {
      color: #65706b;
      font-size: 12px;
      font-weight: 650;
      line-height: 1.55;
      margin: 0;
    }

    .process-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(4, 1fr);
    }

    .process-step {
      background: #fafbf8;
      border: 1px solid #e4ebe3;
      border-radius: 8px;
      min-height: 230px;
      padding: 38px 28px 27px;
      position: relative;
      text-align: center;
    }

    .step-number {
      align-items: center;
      background: #176242;
      border-radius: 50%;
      color: #fff;
      display: flex;
      font-size: 12px;
      font-weight: 900;
      height: 39px;
      justify-content: center;
      left: -12px;
      position: absolute;
      top: -15px;
      width: 39px;
    }

    .process-step .icon-line {
      color: #176242;
      display: block;
      margin: 0 auto 26px;
    }

    .process-step h3 {
      color: #176242;
      font-size: 13px;
      font-weight: 850;
      margin: 0 0 13px;
    }

    .process-step p {
      color: #65706b;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.45;
      margin: 0;
    }

    .team {
      background: #dce2dc;
      padding: 107px 0 112px;
      text-align: center;
    }

    .team h2 {
      color: #176242;
      font-size: 13px;
      font-weight: 850;
      margin: 0 0 22px;
    }

    .team > .about-container > p {
      color: #68736f;
      font-size: 12px;
      font-weight: 650;
      margin: 0 0 60px;
    }

    .team-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(4, 1fr);
    }

    .member {
      background: #fff;
      border-radius: 8px;
      min-height: 217px;
      padding: 19px 20px 25px;
    }

    .member img {
      border: 4px solid #2d7654;
      border-radius: 50%;
      height: 86px;
      object-fit: cover;
      width: 86px;
    }

    .member h3 {
      color: #176242;
      font-size: 13px;
      font-weight: 850;
      margin: 14px 0 5px;
    }

    .member p {
      color: #5f6b67;
      font-size: 12px;
      font-weight: 650;
      margin: 0 0 12px;
    }

    .social {
      color: #5f6b67;
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 8px;
    }

    @media (max-width: 980px) {
      .about-container {
        padding: 0 24px;
      }

      .breadcrumb {
        margin-bottom: 56px;
      }

      .hero-grid,
      .heritage-grid,
      .process-head,
      .core-grid,
      .process-grid,
      .team-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 640px) {
      .hero-grid,
      .heritage-grid,
      .process-head,
      .core-grid,
      .process-grid,
      .team-grid {
        grid-template-columns: 1fr;
      }

      .hero-photo img {
        height: 320px;
      }

      .story-card {
        padding: 36px 24px;
      }
    }
  `],
  template: `
    <section class="hero">
      <div class="about-container">
        <p class="breadcrumb">Home&nbsp; &gt; &nbsp;<span>About</span></p>
        <div class="hero-grid">
          <div>
            <span class="eyebrow">About KhmerCraft</span>
            <p class="hero-copy">
              Connecting Cambodian local sellers with buyers everywhere. We bridge the gap between
              traditional craftsmanship and the global digital economy.
            </p>
            <div class="actions">
              <a class="btn btn-primary" href="/">Explore Marketplace</a>
              <a class="btn btn-secondary" href="#contact">Contact Us</a>
            </div>
          </div>

          <div class="hero-photo">
            <img
              src="https://images.unsplash.com/photo-1586105251261-72a75659a425?w=850&q=85"
              alt="Cambodian artisan weaving"
            />
            <div class="joined-badge">
              <strong>500+</strong>
              <span>ARTISANS JOINED</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="heritage">
      <div class="about-container heritage-grid">
        <article class="story-card">
          <span class="eyebrow">Our Heritage</span>
          <h2>The KhmerCraft Story</h2>
          <p>
            Founded in Phnom Penh, KhmerCraft began as a passion project to document the dying arts
            of rural Cambodia. We realized that while the skill existed, the access to modern
            markets did not. Today, we stand as the premier digital gateway for Cambodian artisans,
            ensuring their stories and products reach appreciative homes across the globe.
          </p>
        </article>

        <div class="mission-stack">
          <article class="mission-card dark">
            <div class="mission-title">
              <kc-icon name="leaf" [size]="24" />
              <span>Our Mission</span>
            </div>
            <p>
              To empower Cambodian local communities by providing a transparent, sustainable, and
              high-reaching platform for their artisanal treasures.
            </p>
          </article>
          <article class="mission-card light">
            <div class="mission-title">
              <kc-icon name="heart" [size]="24" />
              <span>Our Vision</span>
            </div>
            <p>
              To become the world's most trusted source for authentic Khmer crafts, fostering a
              global appreciation for Cambodia's cultural legacy.
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="core">
      <div class="about-container">
        <h2 class="section-title">Core Values That Drive Us</h2>
        <div class="core-grid">
          @for (value of coreValues; track value.title) {
            <article class="core-card">
              <div class="icon-pill"><kc-icon [name]="value.icon" [size]="22" /></div>
              <h3>{{ value.title }}</h3>
              <p>{{ value.description }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="process">
      <div class="about-container">
        <div class="process-head">
          <div>
            <span class="eyebrow">The Process</span>
            <h2>How KhmerCraft Works</h2>
          </div>
          <p>
            Our platform is designed for simplicity, whether you're an artisan in Pursat or a
            collector in Paris.
          </p>
        </div>

        <div class="process-grid">
          @for (step of process; track step.title) {
            <article class="process-step">
              <div class="step-number">{{ step.step }}</div>
              <kc-icon class="icon-line" [name]="step.icon" [size]="36" />
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="team">
      <div class="about-container">
        <h2>The Development Team</h2>
        <p>Built with passion for the Web Development Course.</p>
        <div class="team-grid">
          @for (member of team; track member.name) {
            <article class="member">
              <img [src]="member.image" [alt]="member.name" />
              <h3>{{ member.name }}</h3>
              <p>{{ member.role }}</p>
              <div class="social">G L</div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class AboutPage {
  protected readonly coreValues = [
    {
      title: 'Support Local',
      description:
        'We prioritize direct-to-artisan payments, ensuring that every purchase directly impacts the lives of the creators.',
      icon: 'empower',
    },
    {
      title: 'Promote Heritage',
      description:
        'Every item on KhmerCraft tells a story of tradition, technique, and the resilient spirit of the Cambodian people.',
      icon: 'heritage',
    },
    {
      title: 'Build Trust',
      description:
        'Through rigorous quality checks and secure payment systems, we ensure a seamless and safe experience for everyone.',
      icon: 'shield',
    },
  ];

  protected readonly process = [
    {
      step: 1,
      title: 'Curate & List',
      description:
        'Artisans register and list their handcrafted items with high-quality photos and stories.',
      icon: 'store',
    },
    {
      step: 2,
      title: 'Discover',
      description:
        'Buyers explore curated categories and find unique pieces that resonate with their style.',
      icon: 'globe',
    },
    {
      step: 3,
      title: 'Secure Checkout',
      description:
        'Safe transactions with multiple payment options and artisan-direct revenue sharing.',
      icon: 'wallet',
    },
    {
      step: 4,
      title: 'Global Shipping',
      description:
        'We handle the logistics to ensure your heritage piece arrives safely at your doorstep.',
      icon: 'package',
    },
  ];

  protected readonly team = [
    {
      name: 'Sokha Lim',
      role: 'Lead Developer',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=180&q=85',
    },
    {
      name: 'Vannak Chan',
      role: 'UI/UX Designer',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=180&q=85',
    },
    {
      name: 'Dara Sam',
      role: 'Product Manager',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=180&q=85',
    },
    {
      name: 'Borith Keo',
      role: 'Backend Specialist',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=180&q=85',
    },
  ];
}
