export interface NavLink {
  label: string;
  path: string;
}

export interface Category {
  title: string;
  image: string;
  large?: boolean;
}

export interface Product {
  title: string;
  price: number;
  rating: number;
  image: string;
}

export interface ArtisanStore {
  name: string;
  avatar: string;
  products: string[];
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: string;
}

export interface JourneyStep {
  step: number;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface TeamMember {
  name: string;
  role: string;
  image: string;
}

export interface Milestone {
  year: string;
  title: string;
  description: string;
}

export const navLinks: NavLink[] = [
  { label: 'Why Sell', path: '/seller' },
  { label: 'Explore', path: '/' },
  { label: 'Pricing', path: '#pricing' },
  { label: 'FAQ', path: '#faq' },
  { label: 'About us', path: '/about' },
];

export const categories: Category[] = [
  {
    title: 'Handmade Crafts',
    image:
      'https://images.unsplash.com/photo-1452860606248-958109a91baa?w=800&q=80',
    large: true,
  },
  {
    title: 'Pottery',
    image:
      'https://images.unsplash.com/photo-1578662996442-48f60103fc93?w=600&q=80',
  },
  {
    title: 'Jewelry',
    image:
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
  },
  {
    title: 'Palm Sugar',
    image:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80',
  },
  {
    title: 'Bag & Accessories',
    image:
      'https://images.unsplash.com/photo-1590874103328-eacfd0a9c3f5?w=600&q=80',
  },
  {
    title: 'Organic Tea',
    image:
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  },
];

export const featuredProducts: Product[] = [
  {
    title: 'Traditional Khmer Silk Scarf',
    price: 45,
    rating: 4.9,
    image:
      'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500&q=80',
  },
  {
    title: 'Handcrafted Ceramic Bowl',
    price: 32,
    rating: 4.8,
    image:
      'https://images.unsplash.com/photo-1610701596007-765020692ae2?w=500&q=80',
  },
  {
    title: 'Silver Lotus Earrings',
    price: 58,
    rating: 5.0,
    image:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80',
  },
  {
    title: 'Woven Rattan Basket',
    price: 28,
    rating: 4.7,
    image:
      'https://images.unsplash.com/photo-1595428774223-ef52624120e2?w=500&q=80',
  },
];

export const artisanStores: ArtisanStore[] = [
  {
    name: "Sophea's Pottery",
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    products: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc93?w=200&q=80',
      'https://images.unsplash.com/photo-1610701596007-765020692ae2?w=200&q=80',
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&q=80',
    ],
  },
  {
    name: 'Silk Weavers Co-op',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    products: [
      'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=200&q=80',
      'https://images.unsplash.com/photo-1586105251261-72a75659a425?w=200&q=80',
      'https://images.unsplash.com/photo-1558171819-8864f0c4e8e0?w=200&q=80',
    ],
  },
  {
    name: 'Golden Palm Crafts',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    products: [
      'https://images.unsplash.com/photo-1595428774223-ef52624120e2?w=200&q=80',
      'https://images.unsplash.com/photo-1590874103328-eacfd0a9c3f5?w=200&q=80',
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&q=80',
    ],
  },
];

export const philosophyCards: FeatureCard[] = [
  {
    title: 'Authenticity',
    description:
      'Every product is verified as genuinely handmade by Cambodian artisans, preserving centuries-old traditions.',
    icon: 'shield',
  },
  {
    title: 'Sustainability',
    description:
      'We support eco-friendly practices and fair wages, ensuring craftspeople thrive for generations.',
    icon: 'leaf',
  },
  {
    title: 'Community Impact',
    description:
      'Your purchase directly supports rural communities and keeps cultural heritage alive.',
    icon: 'heart',
  },
];

export const sellerFeatures: FeatureCard[] = [
  {
    title: 'Reach More Buyers',
    description: 'Connect with customers across Cambodia and around the world.',
    icon: 'globe',
  },
  {
    title: 'Your Online Store',
    description: 'Get a beautiful storefront to showcase your unique creations.',
    icon: 'store',
  },
  {
    title: 'Promote Culture',
    description: 'Share the story behind your craft with a global audience.',
    icon: 'culture',
  },
  {
    title: 'Manage Orders',
    description: 'Simple tools to track orders, inventory, and shipping.',
    icon: 'package',
  },
  {
    title: 'Track Payouts',
    description: 'Transparent earnings dashboard with fast, secure payouts.',
    icon: 'wallet',
  },
];

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

export const coreValues: FeatureCard[] = [
  {
    title: 'Preserve Heritage',
    description:
      'We protect and celebrate Cambodia\'s rich craft traditions for future generations.',
    icon: 'heritage',
  },
  {
    title: 'Empower Artisans',
    description:
      'Fair prices and direct connections ensure artisans earn what their work deserves.',
    icon: 'empower',
  },
  {
    title: 'Build Bridges',
    description:
      'We connect Cambodian makers with buyers who value authenticity and craftsmanship.',
    icon: 'bridge',
  },
];

export const milestones: Milestone[] = [
  {
    year: '2022',
    title: 'KhmerCraft Founded',
    description: 'Started with 12 artisan partners in Siem Reap province.',
  },
  {
    year: '2023',
    title: '500+ Artisans Joined',
    description: 'Expanded across 8 provinces with diverse craft categories.',
  },
  {
    year: '2024',
    title: 'International Shipping',
    description: 'Launched global delivery to 30+ countries worldwide.',
  },
  {
    year: '2025',
    title: 'Community Fund Launch',
    description: 'Reinvested 5% of revenue into rural craft education programs.',
  },
];

export const teamMembers: TeamMember[] = [
  {
    name: 'Sreymom Chan',
    role: 'Founder & CEO',
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80',
  },
  {
    name: 'Vannak Lim',
    role: 'Head of Artisan Relations',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80',
  },
  {
    name: 'Bopha Sok',
    role: 'Creative Director',
    image:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80',
  },
  {
    name: 'Dara Meas',
    role: 'Operations Lead',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80',
  },
];
