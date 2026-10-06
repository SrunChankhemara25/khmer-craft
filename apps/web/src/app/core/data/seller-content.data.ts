/**
 * Copy for the seller portal (landing, explore, pricing, guide, FAQ, about).
 *
 * One source for every page, so "what you get" and "what it costs" stay one
 * honest list instead of several copies that drift apart.
 *
 * House rule carried over from the original landing page: nothing here claims
 * a number the marketplace cannot back up. No seller counts, no revenue
 * figures, no ratings. Seller journeys are written as clearly-labelled
 * examples, never as testimonials from real people.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  icon: string;
  items: FaqItem[];
}

export interface SellerTool {
  icon: string;
  title: string;
  description: string;
}

export interface SellerStep {
  number: string;
  title: string;
  description: string;
  icon: string;
  time: string;
}

export interface SellerPlan {
  key: 'STARTER' | 'STANDARD' | 'PREMIUM';
  name: string;
  price: number;
  badge: string;
  tagline: string;
  description: string;
  bestFor: string;
  featured: boolean;
  features: string[];
}

export interface GuideChapter {
  id: string;
  number: string;
  title: string;
  icon: string;
  readTime: string;
  intro: string;
  tips: { title: string; body: string }[];
  checklist: string[];
}

/**
 * The actual registration → first order path, worded to match what the
 * onboarding flow and seller workspace really do.
 */
export const sellerSteps: SellerStep[] = [
  {
    number: '01',
    title: 'Use your KhmerCraft account',
    description: 'Sign in or create one marketplace account. The same account shops, sells, and owns every store you open.',
    icon: 'user',
    time: '1 minute',
  },
  {
    number: '02',
    title: 'Set up your store',
    description: 'Choose a name, category and province, then pick a style, brand color, logo and cover for your storefront.',
    icon: 'store',
    time: '3 minutes',
  },
  {
    number: '03',
    title: 'Add your products',
    description: 'Upload photos, write a description, set a price and stock count. Drafts stay private until you publish.',
    icon: 'plus-square',
    time: '5 minutes per product',
  },
  {
    number: '04',
    title: 'Receive your first order',
    description: 'Orders arrive complete — items, quantity, delivery address and payment status — in your seller workspace.',
    icon: 'clipboard',
    time: 'When buyers find you',
  },
  {
    number: '05',
    title: 'Grow from there',
    description: 'Read reviews, watch what sells, restock what runs low and add what buyers keep asking for.',
    icon: 'chart',
    time: 'Every week',
  },
];

/** The real capabilities of the seller workspace. */
export const sellerTools: SellerTool[] = [
  { icon: 'store', title: 'Your own storefront', description: 'A page with your name, logo, cover, story and products — in one of three styles and your own brand color.' },
  { icon: 'box', title: 'Products and inventory', description: 'Several photos per product, colour and size options, prices and stock counts that drop as things sell.' },
  { icon: 'cart', title: 'Order management', description: 'Confirm orders, mark them ready or shipped, and see at a glance what still needs you.' },
  { icon: 'grid', title: 'Your own categories', description: 'Group products the way your shop is actually arranged, on top of the marketplace departments.' },
  { icon: 'truck', title: 'Stock locations', description: 'Record where each product is kept — home, workshop or warehouse — so orders are picked from the right place.' },
  { icon: 'review', title: 'Reviews and replies', description: 'Read what buyers said about each product and answer them directly, in public.' },
  { icon: 'wallet', title: 'Plan and billing', description: 'See which plan each store is on, when it renews, and pay for upgrades with ABA KHQR.' },
  { icon: 'plus', title: 'More than one store', description: 'One account can run several stores, each with its own look, plan and catalogue.' },
];

/** What KhmerCraft commits to, in return for a seller's trust. */
export const sellerPromises: { icon: string; title: string; body: string }[] = [
  { icon: 'percent', title: 'Clear pricing', body: 'Plans are a flat monthly price, shown before you start. Starter is free, with no card required.' },
  { icon: 'lock', title: 'You stay in control', body: 'Nothing is published until you say so. Edit your store, prices and products any time.' },
  { icon: 'shield', title: 'No surprise charges', body: 'A paid plan is only activated after you confirm the payment yourself through ABA.' },
  { icon: 'heart', title: 'Built for Cambodia', body: 'Every province, local payment with KHQR, and support from a team that sells here too.' },
];

/**
 * Illustrative seller journeys. These are examples of how different kinds of
 * sellers use the platform — not testimonials, and labelled as such on page.
 */
export const sellerJourneys: { name: string; trade: string; place: string; image: string; before: string; after: string; tag: string }[] = [
  {
    name: 'A weaving family',
    trade: 'Silk scarves & krama',
    place: 'Takeo',
    image: '/assets/promos/khmer-fashion.webp',
    tag: 'Fashion & Accessories',
    before: 'Sells to whoever visits the village, and to a few regulars over chat.',
    after: 'Lists each pattern with photos, so buyers in Phnom Penh can order without ever visiting.',
  },
  {
    name: 'A ceramics workshop',
    trade: 'Clay tea sets & bowls',
    place: 'Kampong Chhnang',
    image: '/assets/promos/artisan-homeware.webp',
    tag: 'Home & Living',
    before: 'Fragile pieces, so every order was a long chat about packing and delivery.',
    after: 'Stock locations and clear delivery notes on each listing answer those questions up front.',
  },
  {
    name: 'A home skincare maker',
    trade: 'Coconut oils & balms',
    place: 'Kampot',
    image: '/assets/promos/botanical-beauty.webp',
    tag: 'Beauty & Wellness',
    before: 'Small batches, so stock was hard to track and sold-out items kept getting ordered.',
    after: 'Stock counts drop as things sell, and a product simply stops taking orders at zero.',
  },
];

/** A day running a store — the rhythm, not a promise of volume. */
export const dayWithYourStore: { time: string; title: string; body: string; icon: string }[] = [
  { time: '08:00', title: 'Check what came in overnight', body: 'New orders wait in one list with items, address and payment status already filled in.', icon: 'bell' },
  { time: '10:30', title: 'Pack and mark as ready', body: 'Pick from the stock location on each order, then update its status so the buyer knows.', icon: 'package' },
  { time: '14:00', title: 'Hand over for delivery', body: 'Mark the order shipped. No more retyping addresses from screenshots.', icon: 'truck' },
  { time: '17:00', title: 'Add tomorrow’s new piece', body: 'Snap a few photos, write two lines about it, set a price and publish — or save a draft.', icon: 'image' },
  { time: '20:00', title: 'Reply to a review', body: 'Thank a buyer in public. Other shoppers read those replies before they decide.', icon: 'review' },
];

/** What to have ready before opening a store. */
export const prepChecklist: { title: string; detail: string }[] = [
  { title: 'A store name', detail: 'Specific beats generic — “Takeo Silk House” over “My Shop”.' },
  { title: 'A contact number', detail: 'A Cambodian number KhmerCraft support can reach you on.' },
  { title: 'Your province', detail: 'Where you work from, so buyers know where orders ship from.' },
  { title: '3–5 good product photos', detail: 'Daylight, plain background, the product filling the frame.' },
  { title: 'Prices you’re happy with', detail: 'Include your materials, your time and your packaging.' },
  { title: 'A two-line story', detail: 'Who you are and what makes your work different. Optional, but buyers read it.' },
];

export const sellerPlans: SellerPlan[] = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 0,
    badge: 'Start here',
    tagline: 'Free, forever',
    description: 'A complete storefront for a new or small business.',
    bestFor: 'Makers testing the waters, or anyone with a handful of products.',
    featured: false,
    features: ['Your own storefront', 'Publish and manage products', 'Receive and manage orders', 'Store profile and customer reviews'],
  },
  {
    key: 'STANDARD',
    name: 'Growth',
    price: 12,
    badge: 'Most popular',
    tagline: 'For a growing catalogue',
    description: 'More visibility and insight for active sellers.',
    bestFor: 'Sellers with regular orders who want to understand what sells.',
    featured: true,
    features: ['Everything in Starter', 'Expanded sales insights', 'Priority marketplace support'],
  },
  {
    key: 'PREMIUM',
    name: 'Professional',
    price: 29,
    badge: 'For established brands',
    tagline: 'For a real operation',
    description: 'Support and tools for an established store operation.',
    bestFor: 'Established workshops and brands with a large range and a team behind it.',
    featured: false,
    features: ['Everything in Growth', 'Professional onboarding support', 'Early access to new seller tools'],
  },
];

/** Full plan comparison. `true` = included, `false` = not, a string = detail. */
export const planComparison: { group: string; rows: { label: string; values: [boolean | string, boolean | string, boolean | string] }[] }[] = [
  {
    group: 'Your store',
    rows: [
      { label: 'Storefront with your name, logo and story', values: [true, true, true] },
      { label: 'Store styles and brand colors', values: [true, true, true] },
      { label: 'Products you can publish', values: ['No cap', 'No cap', 'No cap'] },
      { label: 'Your own product categories', values: [true, true, true] },
    ],
  },
  {
    group: 'Selling',
    rows: [
      { label: 'Order management', values: [true, true, true] },
      { label: 'Stock counts and stock locations', values: [true, true, true] },
      { label: 'Customer reviews and replies', values: [true, true, true] },
      { label: 'Expanded sales insights', values: [false, true, true] },
    ],
  },
  {
    group: 'Support',
    rows: [
      { label: 'Help centre and seller guide', values: [true, true, true] },
      { label: 'Priority marketplace support', values: [false, true, true] },
      { label: 'Professional onboarding support', values: [false, false, true] },
      { label: 'Early access to new seller tools', values: [false, false, true] },
    ],
  },
];

/** How a paid plan is actually paid for — matches the onboarding + /seller/plan/pay flow. */
export const billingSteps: { title: string; body: string }[] = [
  { title: 'Create your store', body: 'Every store starts on Starter, free, the moment it is created.' },
  { title: 'Open the ABA KHQR', body: 'Choosing Growth or Professional takes you to a KHQR code for that plan.' },
  { title: 'Scan and pay in your bank app', body: 'Pay with ABA Mobile or any bank app that supports KHQR.' },
  { title: 'Your plan switches on', body: 'As soon as ABA confirms the payment, the plan is active for 30 days.' },
];

export const faqCategories: FaqCategory[] = [
  {
    id: 'start',
    label: 'Getting started',
    icon: 'sparkles',
    items: [
      { question: 'Who can sell on KhmerCraft?', answer: 'Anyone running a business in Cambodia — from a single maker working from home to an established shop. You need a KhmerCraft account and a Cambodian contact number.' },
      { question: 'How long does it take to open a store?', answer: 'Store setup is four short steps and usually takes about five minutes. Adding your first product takes a few more. You can save and come back at any point.' },
      { question: 'Do I need a separate account to sell?', answer: 'No. The same KhmerCraft account you shop with can open a store. One account can also own more than one store.' },
      { question: 'Can I open the store now and add products later?', answer: 'Yes. Your store is created straight away, and products stay as private drafts until you choose to publish them.' },
      { question: 'Do I need a registered business?', answer: 'You do not need one to open a store. Seller verification is a separate step from creating your store, and the team will contact you if anything else is needed for your category.' },
    ],
  },
  {
    id: 'store',
    label: 'Store & products',
    icon: 'store',
    items: [
      { question: 'Can I change my store’s look after creating it?', answer: 'Yes. Name, description, style, brand color, logo and cover can all be changed later from your seller dashboard.' },
      { question: 'What can I sell?', answer: 'Products across fashion, food, home, beauty, electronics, kids and family, and arts and culture. Choose the department that fits each product and add your own categories on top.' },
      { question: 'How many photos can a product have?', answer: 'Several. Use the first photo for the clearest shot of the whole product, and the rest for details, scale and the product in use.' },
      { question: 'Can a product have sizes or colours?', answer: 'Yes. Products support options such as colour and size, so one listing can cover every variation.' },
      { question: 'What happens when something sells out?', answer: 'Stock counts drop automatically with each order. When a product reaches zero it stops taking new orders until you restock it.' },
    ],
  },
  {
    id: 'orders',
    label: 'Orders & delivery',
    icon: 'truck',
    items: [
      { question: 'How do I know when I get an order?', answer: 'New orders appear in Incoming orders in your seller workspace, with items, quantity, delivery address and payment status.' },
      { question: 'What shipping options are available?', answer: 'Delivery depends on your product, where it ships from and where the buyer is. Make sure what your listing promises matches what you can actually deliver.' },
      { question: 'Can I sell from any province?', answer: 'Yes. Store setup accepts every Cambodian province. If your delivery coverage needs special handling, mention it in your listings and store description.' },
      { question: 'How do I update an order’s status?', answer: 'Open the order and move it along — confirmed, ready, shipped, delivered. Buyers can follow the status from their own orders page.' },
    ],
  },
  {
    id: 'money',
    label: 'Payments & plans',
    icon: 'wallet',
    items: [
      { question: 'How much does it cost to sell?', answer: 'Starter is $0 per month, Growth is $12 and Professional is $29. Each store has its own plan, so different stores can be on different plans.' },
      { question: 'How do I pay for a paid plan?', answer: 'With ABA KHQR. After your store is created you are shown a KHQR code; scan it in ABA Mobile or any KHQR-enabled bank app. The plan activates once ABA confirms the payment.' },
      { question: 'Will I be charged automatically?', answer: 'No. A paid plan only starts after you confirm the payment yourself. Nothing is taken without your action.' },
      { question: 'How do I get paid for orders?', answer: 'Payout details are confirmed during seller setup. Your workspace shows the payment status on every order so you can reconcile without screenshots.' },
      { question: 'Can I switch plans later?', answer: 'Yes. Start on Starter and upgrade whenever your store is ready. Plan and billing for each store live under Plan & billing in your dashboard.' },
    ],
  },
  {
    id: 'account',
    label: 'Account & safety',
    icon: 'shield',
    items: [
      { question: 'Is my contact number shown to buyers?', answer: 'No. Your store contact number is only shown to KhmerCraft support unless you choose to publish it later.' },
      { question: 'Can I have more than one store?', answer: 'Yes. Use “Create another store” in your dashboard. Each store has its own look, catalogue and plan.' },
      { question: 'What if I forget my password?', answer: 'Use “Forgot password” on the sign-in page and we will email you a secure link to set a new one.' },
      { question: 'How do I get help?', answer: 'Start with the seller guide and this FAQ. For anything else, contact support from the help centre — Growth and Professional stores get priority.' },
    ],
  },
];

/** Every question in one list, for previews on other pages. */
export const faqItems: FaqItem[] = faqCategories.flatMap((category) => category.items);

export const guideChapters: GuideChapter[] = [
  {
    id: 'photos',
    number: '01',
    title: 'Product photos that sell',
    icon: 'image',
    readTime: '4 min read',
    intro: 'Online, your photo is the product. Buyers cannot touch the silk or lift the bowl, so the picture has to do it for them. You do not need a camera — a phone and a window are enough.',
    tips: [
      { title: 'Use daylight, not flash', body: 'Stand near a window in the morning or late afternoon. Soft daylight shows true colour; flash flattens texture and turns whites blue.' },
      { title: 'Keep the background plain', body: 'A white sheet, a wooden table or a clean wall. The product should be the only thing the eye lands on.' },
      { title: 'Fill the frame', body: 'Get close enough that the product takes up most of the photo. Crop later if you need to, but do not leave it small in the middle.' },
      { title: 'Show scale and detail', body: 'Add one photo in a hand or next to a familiar object, and one close-up of the stitching, glaze or label.' },
      { title: 'Show it in use', body: 'A scarf worn, a basket holding fruit, a balm on skin. Buyers picture themselves using it.' },
    ],
    checklist: ['First photo shows the whole product', 'At least one close-up', 'One photo shows size', 'Colours look true on your phone screen'],
  },
  {
    id: 'descriptions',
    number: '02',
    title: 'Descriptions people read',
    icon: 'edit',
    readTime: '3 min read',
    intro: 'A good description answers the questions a buyer would ask you in a chat — before they have to ask. Short sentences, specific facts, a little of your story.',
    tips: [
      { title: 'Lead with what it is', body: '“Hand-woven silk krama, 180 × 60 cm” tells more in one line than three lines of adjectives.' },
      { title: 'Give the facts', body: 'Material, size, weight, colour, care instructions. Facts build trust; vague words make people hesitate.' },
      { title: 'Say who made it, and how', body: 'One or two sentences about your workshop, your village or your technique. This is what a chain store cannot copy.' },
      { title: 'Be honest about variation', body: 'If every piece is handmade and slightly different, say so. It turns a possible complaint into a reason to buy.' },
    ],
    checklist: ['Product name says what it is', 'Size and material included', 'Care or usage note', 'One line about how it is made'],
  },
  {
    id: 'pricing',
    number: '03',
    title: 'Pricing your work',
    icon: 'percent',
    readTime: '4 min read',
    intro: 'Underpricing is the most common mistake new sellers make. A price that is too low does not just cost you money — it makes buyers wonder what is wrong with the product.',
    tips: [
      { title: 'Add up the real cost', body: 'Materials, packaging, your time at an honest hourly rate, and a share of costs like electricity and transport.' },
      { title: 'Then add a margin', body: 'Your margin is what lets you buy materials for the next batch, replace tools and grow. It is not greed.' },
      { title: 'Look around, but do not copy', body: 'Browse similar products on KhmerCraft. If yours is better made, it can cost more — just make sure the photos and description show why.' },
      { title: 'Round to clean numbers', body: '$18.00 reads more confidently than $17.37. Keep prices simple and consistent across your store.' },
    ],
    checklist: ['Materials and time counted', 'Packaging included', 'Margin added', 'Compared with similar products'],
  },
  {
    id: 'packaging',
    number: '04',
    title: 'Packing and delivery',
    icon: 'package',
    readTime: '3 min read',
    intro: 'The moment a buyer opens the parcel is the moment they decide whether to come back. Careful packing protects the product and your reviews.',
    tips: [
      { title: 'Protect fragile pieces twice', body: 'Wrap the item, then cushion the box so nothing moves when you shake it. Ceramics and glass need both.' },
      { title: 'Keep food sealed and labelled', body: 'Airtight packaging, the product name, and a best-before date. Buyers trust food that looks cared for.' },
      { title: 'Add a small personal touch', body: 'A handwritten thank-you or a card with your store name. It costs little and is often what people mention in reviews.' },
      { title: 'Update the order as you go', body: 'Mark orders ready and shipped in your workspace. A buyer who can see progress rarely needs to message you.' },
    ],
    checklist: ['Fragile items double-protected', 'Store name inside the parcel', 'Order marked shipped', 'Delivery promise matches the listing'],
  },
  {
    id: 'service',
    number: '05',
    title: 'Talking to buyers',
    icon: 'heart',
    readTime: '3 min read',
    intro: 'Great service is mostly speed and kindness. Buyers forgive a small delay if you tell them about it; they rarely forgive silence.',
    tips: [
      { title: 'Reply the same day', body: 'Even a short “Thank you, I’ll check and reply this evening” keeps a buyer from moving on.' },
      { title: 'Reply to reviews in public', body: 'Thank people for good reviews. For a bad one, apologise, explain what you will do, and keep it calm — future buyers are reading.' },
      { title: 'Fix problems generously', body: 'A replacement or a refund on a rare mistake costs less than the trust you would lose.' },
    ],
    checklist: ['Questions answered within a day', 'Every review has a reply', 'A clear plan for returns'],
  },
  {
    id: 'growth',
    number: '06',
    title: 'Growing your store',
    icon: 'chart',
    readTime: '4 min read',
    intro: 'Growth on a marketplace is steady rather than sudden. A few small habits, repeated every week, compound.',
    tips: [
      { title: 'Add something new regularly', body: 'A new product, colour or bundle gives returning buyers a reason to look again.' },
      { title: 'Restock your best sellers first', body: 'Check which products sell out and keep them available before you add anything new.' },
      { title: 'Organise with your own categories', body: 'As your range grows, group products the way buyers think — “Gifts under $20”, “New this month”.' },
      { title: 'Share your store link', body: 'Your storefront has its own link. Put it on your social pages, business cards and packaging.' },
      { title: 'Upgrade when it pays for itself', body: 'When regular orders arrive, Growth’s sales insights help you see what to make more of.' },
    ],
    checklist: ['Something new each month', 'Best sellers in stock', 'Store link on your social pages', 'Plan reviewed every few months'],
  },
];
