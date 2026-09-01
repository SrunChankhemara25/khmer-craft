/**
 * Copy for the seller landing page.
 *
 * Lifted from site-data.ts on origin/prototype (Seypa47) — only the two
 * collections the seller pages actually read, rather than the whole file,
 * which also carried homepage and about-page content this tree already has.
 */

export interface JourneyStep {
  step: number;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const journeySteps: JourneyStep[] = [
  {
    step: 1,
    title: 'Register',
    description: 'Create your account and complete your seller profile.',
  },
  {
    step: 2,
    title: 'Setup Store',
    description: 'Add your store logo, story, and banner image.',
  },
  {
    step: 3,
    title: 'List Products',
    description: 'Upload high-quality photos and detailed descriptions.',
  },
  {
    step: 4,
    title: 'Get Orders',
    description: 'Manage orders through your dashboard.',
  },
  {
    step: 5,
    title: 'Grow',
    description: 'Use analytics and feedback to increase your reach.',
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'How much does it cost to sell?',
    answer:
      'Registration is free with no monthly fees. We only take a small commission when you make a sale, helping you start risk-free.',
  },
  {
    question: 'What shipping options are available?',
    answer:
      'We integrate with leading local logistics providers across Cambodia to handle door-to-door delivery nationwide and global shipping.',
  },
  {
    question: 'How do I get paid?',
    answer:
      'Earnings are deposited directly to your bank account or Wing/ABA mobile wallet on a flexible weekly payout schedule.',
  },
  {
    question: 'Can I sell from any province?',
    answer:
      'Yes! We support artisans from Phnom Penh, Siem Reap, Battambang, Kampot, and all 25 provinces across Cambodia.',
  },
];
