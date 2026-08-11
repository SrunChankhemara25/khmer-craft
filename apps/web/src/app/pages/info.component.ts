import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';

interface InfoSection {
  heading: string;
  body: string;
}

interface InfoPage {
  title: string;
  intro: string;
  sections: InfoSection[];
}

/**
 * Help, Contact, Shipping, Terms and Privacy differ only in copy, so they share
 * one component selected by `data.page` on the route. These are honest
 * placeholders — real policy text needs legal review before launch.
 */
const PAGES: Record<string, InfoPage> = {
  help: {
    title: 'Help centre',
    intro: 'Answers to the questions buyers ask us most often.',
    sections: [
      {
        heading: 'How long does delivery take?',
        body: 'Orders inside Phnom Penh usually arrive within two working days. Provincial delivery takes three to five, depending on the courier route.',
      },
      {
        heading: 'How do I track my order?',
        body: 'Open My Orders from your profile. Every order shows its current status and, once dispatched, the courier reference.',
      },
      {
        heading: 'Can I return an item?',
        body: 'Unused items can be returned within seven days. Because most products are handmade, small variations in colour and weave are not considered faults.',
      },
      {
        heading: 'How do sellers get paid?',
        body: 'Sellers are settled weekly for delivered orders, minus the marketplace fee shown in the seller dashboard.',
      },
    ],
  },
  contact: {
    title: 'Contact us',
    intro: 'We reply to most messages within one working day.',
    sections: [
      {
        heading: 'Buyer support',
        body: 'support@khmercraft.example — order issues, delivery questions, returns.',
      },
      {
        heading: 'Seller support',
        body: 'sellers@khmercraft.example — onboarding, listings, payouts.',
      },
      {
        heading: 'Office',
        body: 'Phnom Penh, Cambodia. Visits by appointment only.',
      },
    ],
  },
  shipping: {
    title: 'Shipping information',
    intro: 'What delivery costs and how long it takes.',
    sections: [
      {
        heading: 'Delivery charges',
        body: 'A flat $3.50 applies to orders under $50. Orders of $50 or more ship free inside Cambodia.',
      },
      {
        heading: 'Delivery times',
        body: 'Phnom Penh: one to two working days. Provinces: three to five working days.',
      },
      {
        heading: 'Multi-seller orders',
        body: 'Items from different artisans may arrive separately, at no extra cost to you.',
      },
    ],
  },
  terms: {
    title: 'Terms of service',
    intro:
      'Placeholder terms for the MVP. These require legal review before launch.',
    sections: [
      {
        heading: 'Using KhmerCraft',
        body: 'You agree to use the marketplace lawfully and not to misrepresent yourself when buying or selling.',
      },
      {
        heading: 'Orders and payment',
        body: 'An order is a request to buy. It is confirmed once the seller accepts and payment is authorised.',
      },
      {
        heading: 'Seller obligations',
        body: 'Sellers must describe products accurately, hold the stock they list, and dispatch within the stated handling time.',
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro:
      'Placeholder policy for the MVP. This requires legal review before launch.',
    sections: [
      {
        heading: 'What we collect',
        body: 'Your name, email, phone number and delivery address, plus the orders you place.',
      },
      {
        heading: 'How we use it',
        body: 'To process orders, arrange delivery, and contact you about those orders. We do not sell personal data.',
      },
      {
        heading: 'Your choices',
        body: 'You can update your details from your profile, or ask us to delete your account by contacting support.',
      },
    ],
  },
};

@Component({
  selector: 'app-info',
  imports: [RouterLink, NavbarComponent, FooterComponent],
  template: `
    <app-navbar />

    @if (page(); as info) {
      <section class="container info">
        <nav class="crumbs">
          <a routerLink="/">Home</a> <span>›</span> <span>{{ info.title }}</span>
        </nav>

        <h1>{{ info.title }}</h1>
        <p class="intro">{{ info.intro }}</p>

        <div class="sections">
          @for (section of info.sections; track section.heading) {
            <article class="card section">
              <h2>{{ section.heading }}</h2>
              <p>{{ section.body }}</p>
            </article>
          }
        </div>

        <p class="more">
          Still stuck? <a routerLink="/contact">Contact our team</a>.
        </p>
      </section>
    }

    <app-footer />
  `,
  styles: [
    `
      .info {
        padding: 30px 32px 64px;
        max-width: 820px;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 18px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      h1 {
        font-size: 30px;
        margin-bottom: 10px;
      }
      .intro {
        color: var(--color-muted);
        font-size: 15px;
        margin-bottom: 30px;
      }
      .sections {
        display: grid;
        gap: 14px;
      }
      .section {
        padding: 20px 22px;
      }
      .section h2 {
        font-size: 15.5px;
        margin-bottom: 7px;
      }
      .section p {
        color: var(--color-text-secondary);
        font-size: 14px;
        line-height: 1.65;
      }
      .more {
        margin-top: 28px;
        font-size: 14px;
        color: var(--color-muted);
      }
      .more a {
        color: var(--color-accent);
        font-weight: 600;
      }
      .more a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class InfoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  protected readonly page = computed<InfoPage | undefined>(
    () => PAGES[this.data()['page'] as string],
  );
}
