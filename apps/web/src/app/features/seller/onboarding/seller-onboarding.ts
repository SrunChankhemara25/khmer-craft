import { Component, InjectionToken, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { SellerService, SellerStore } from '../../../core/api/seller.service';
import { AuthService, apiErrorMessage } from '../../../core/auth/auth.service';

import { DEFAULT_STORE_APPEARANCE, STORE_FONTS, StoreAppearance, storeBrandColor, storeFontFamily } from '../../../core/catalog/store-appearance';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;
type PlanKey = 'STARTER' | 'STANDARD' | 'PREMIUM';
type PaymentKey = 'FREE' | 'ABA';

interface StoreDraft {
  storeName: string;
  category: string;
  location: string;
  phoneNumber: string;
  storeDescription: string;
}

export const ONBOARDING_DRAFT_KEY = new InjectionToken<string>('Onboarding draft key', {
  providedIn: 'root', factory: () => 'khmercraft.store-onboarding-draft.v2',
});

@Component({
  selector: 'app-seller-onboarding',
  imports: [FormsModule, RouterLink, KcIcon],
  templateUrl: './seller-onboarding.html',
  styleUrl: './seller-onboarding.css',
})
export class SellerOnboardingPage implements OnInit {
  private readonly draftKey = inject(ONBOARDING_DRAFT_KEY);
  private readonly auth = inject(AuthService);
  private readonly sellerService = inject(SellerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly user = this.auth.user;
  protected readonly step = signal<OnboardingStep>(1);
  protected readonly selectedPlan = signal<PlanKey>('STARTER');
  protected readonly selectedPayment = signal<PaymentKey>('FREE');
  protected readonly existingStores = signal<SellerStore[]>([]);
  protected readonly createdStore = signal<SellerStore | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  protected readonly draftRestored = signal(false);
  protected readonly termsAccepted = signal(false);
  protected readonly appearance = signal<StoreAppearance>({ ...DEFAULT_STORE_APPEARANCE });
  protected readonly brandColor = computed(() => storeBrandColor(this.appearance()));
  protected readonly previewFont = computed(() => storeFontFamily(this.appearance().font));
  protected readonly fonts = STORE_FONTS;
  protected readonly styles = [
    { id: 'clean' as const, name: 'Clean', detail: 'Simple & modern' },
    { id: 'warm' as const, name: 'Warm', detail: 'Friendly & cozy' },
    { id: 'bold' as const, name: 'Bold', detail: 'Modern & striking' },
  ];
  protected readonly colors = [
    { name: 'Forest', value: '#1f5c45' }, { name: 'Gold', value: '#e0a83c' },
    { name: 'Red', value: '#a3372a' }, { name: 'Blue', value: '#3f6fb0' },
    { name: 'Pink', value: '#e06fa0' }, { name: 'Purple', value: '#7c4fae' },
  ];

  /** A small canned catalogue so the preview never feels empty before the seller lists anything. */
  private readonly demoProducts: Record<string, { name: string; price: string; description: string; image: string }> = {
    'Fashion & Accessories': { name: 'Classic Linen Shirt', price: '22.00', description: 'A lightweight and comfortable shirt for everyday wear.', image: '/categories/fashion.png' },
    'Food & Groceries': { name: 'Kampot Pepper', price: '6.00', description: "Aromatic peppercorns grown in Kampot's red soil.", image: '/categories/food-groceries.png' },
    'Home & Living': { name: 'Handwoven Rattan Basket', price: '18.00', description: 'A sturdy, handwoven basket for everyday storage.', image: '/categories/home-living.png' },
    'Beauty & Wellness': { name: 'Coconut Body Oil', price: '9.50', description: 'A lightweight oil made from cold-pressed coconut.', image: '/categories/beauty-wellness.png' },
    'Electronics': { name: 'USB-C Charging Cable', price: '7.00', description: 'A durable cable for everyday charging.', image: '/categories/electronics.png' },
    'Kids & Family': { name: 'Wooden Building Blocks', price: '14.00', description: 'Safe, hand-sanded blocks for imaginative play.', image: '/categories/kids-family.png' },
    'Arts & Culture': { name: 'Hand-Painted Ceramic Bowl', price: '16.00', description: 'A one-of-a-kind bowl painted by a local artisan.', image: '/categories/arts-culture.png' },
  };

  protected previewProduct(): { name: string; price: string; description: string; image: string } {
    return this.demoProducts[this.form.category] ?? this.demoProducts['Fashion & Accessories'];
  }
  protected readonly logo = signal('');
  protected readonly cover = signal('');
  protected readonly imageError = signal('');
  protected readonly draftError = signal('');
  protected readonly imageLoading = signal(0);
  private imageRequest = { logo: 0, cover: 0 };

  protected setAppearance(change: Partial<StoreAppearance>): void {
    this.appearance.update(current => ({ ...current, ...change }));
    this.saveDraft();
  }

  protected async changeImage(event: Event, kind: 'logo' | 'cover'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.imageError.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.imageError.set('Choose a JPG, PNG or WebP image smaller than 10 MB.');
      return;
    }
    const request = ++this.imageRequest[kind];
    const url = URL.createObjectURL(file);
    this.imageLoading.update(count => count + 1);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, (kind === 'logo' ? 512 : 1600) / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing unavailable');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (request === this.imageRequest[kind]) {
        this[kind].set(canvas.toDataURL('image/jpeg', .82));
        this.saveDraft();
      }
    } catch {
      if (request === this.imageRequest[kind]) this.imageError.set('This image could not be opened. Please choose another.');
    } finally {
      URL.revokeObjectURL(url);
      this.imageLoading.update(count => count - 1);
    }
  }

  protected form: StoreDraft = {
    storeName: '',
    category: '',
    location: '',
    phoneNumber: '',
    storeDescription: '',
  };

  protected readonly progress = [
    { step: 1 as const, label: 'Store essentials' },
    { step: 2 as const, label: 'Your storefront' },
    { step: 3 as const, label: 'Choose a plan' },
    { step: 4 as const, label: 'Review & create' },
  ];

  protected readonly categoryQuery = signal('');
  protected readonly categoryMenuOpen = signal(false);
  protected readonly previewTab = signal<'home' | 'about' | 'contact'>('home');

  protected readonly filteredCategories = computed(() => {
    const query = this.categoryQuery().trim().toLowerCase();
    if (!query) return this.categories;
    return this.categories.filter((category) => category.toLowerCase().includes(query));
  });

  protected readonly categories = [
    'Fashion & Accessories',
    'Food & Groceries',
    'Home & Living',
    'Beauty & Wellness',
    'Electronics',
    'Kids & Family',
    'Arts & Culture',
  ];

  protected readonly locations = [
    'Phnom Penh',
    'Siem Reap',
    'Battambang',
    'Kampong Cham',
    'Kampong Speu',
    'Kandal',
    'Kampot',
    'Takeo',
    'Other province',
  ];

  protected readonly plans: Array<{
    key: PlanKey;
    name: string;
    price: number;
    description: string;
    badge?: string;
    features: string[];
  }> = [
    {
      key: 'STARTER',
      name: 'Starter',
      price: 0,
      description: 'A complete storefront for a new or small business.',
      features: ['Publish and manage products', 'Receive and manage orders', 'Store profile and customer reviews'],
    },
    {
      key: 'STANDARD',
      name: 'Growth',
      price: 12,
      description: 'More visibility and insight for a growing catalogue.',
      badge: 'Most popular',
      features: ['Everything in Starter', 'Expanded sales insights', 'Priority marketplace support'],
    },
    {
      key: 'PREMIUM',
      name: 'Professional',
      price: 29,
      description: 'Support and tools for an established store operation.',
      features: ['Everything in Growth', 'Professional onboarding support', 'Early access to new seller tools'],
    },
  ];

  protected readonly currentPlan = computed(() =>
    this.plans.find((plan) => plan.key === this.selectedPlan()) ?? this.plans[0],
  );

  protected readonly progressPercent = computed(() =>
    this.step() === 5 ? 100 : Math.max(8, ((this.step() - 1) / 4) * 100),
  );

  protected storeInitials(): string {
    const value = this.form.storeName.trim();
    if (!value) return 'S';
    return value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  protected readonly isAdditionalStore = computed(() => this.existingStores().length > 0);

  ngOnInit(): void {
    this.restoreDraft();
    this.applyEntryContext();
    this.categoryQuery.set(this.form.category);
    this.sellerService.getMyStores().subscribe({
      next: (stores) => this.existingStores.set(stores),
      error: () => this.existingStores.set([]),
    });
  }

  /** A quick, local heuristic — not a real AI call — that reacts as the seller types. */
  protected nameTip(): { tone: 'hint' | 'warn' | 'good'; message: string } {
    const name = this.form.storeName.trim();
    if (!name) {
      return { tone: 'hint', message: 'Start typing — we’ll flag names buyers tend to skip past.' };
    }
    if (name.length < 4 || /^(my\s+)?(store|shop)\s*\d*$/i.test(name)) {
      return { tone: 'warn', message: 'Avoid generic names like “Store 1” — buyers trust names that explain the business.' };
    }
    return { tone: 'good', message: 'Good — a specific name like this helps buyers trust your store.' };
  }

  protected onCategoryInput(value: string): void {
    this.categoryQuery.set(value);
    this.categoryMenuOpen.set(true);
  }

  protected selectCategory(value: string): void {
    this.form.category = value;
    this.categoryQuery.set(value);
    this.categoryMenuOpen.set(false);
    this.errors.update(({ category, ...rest }) => rest);
    this.saveDraft();
  }

  protected onCategoryBlur(): void {
    setTimeout(() => {
      const query = this.categoryQuery().trim();
      const match = this.categories.find((category) => category.toLowerCase() === query.toLowerCase());
      if (match) {
        this.form.category = match;
        this.categoryQuery.set(match);
      } else {
        this.categoryQuery.set(this.form.category);
      }
      this.categoryMenuOpen.set(false);
    }, 120);
  }

  protected onCategoryKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.categoryQuery.set(this.form.category);
      this.categoryMenuOpen.set(false);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const [first] = this.filteredCategories();
      if (first) this.selectCategory(first);
    }
  }

  protected next(): void {
    if (!this.validateStep(this.step())) return;
    this.errors.set({});
    this.submitError.set('');
    this.step.update((value) => Math.min(4, value + 1) as OnboardingStep);
    this.scrollToTop();
  }

  protected back(): void {
    this.errors.set({});
    this.submitError.set('');
    this.step.update((value) => Math.max(1, value - 1) as OnboardingStep);
    this.scrollToTop();
  }

  protected goTo(target: OnboardingStep): void {
    if (target >= this.step() || target === 5) return;
    this.errors.set({});
    this.step.set(target);
    this.scrollToTop();
  }

  protected selectPlan(plan: PlanKey): void {
    this.selectedPlan.set(plan);
    this.selectedPayment.set(plan === 'STARTER' ? 'FREE' : 'ABA');
    this.saveDraft();
  }

  protected updateTerms(value: boolean): void {
    this.termsAccepted.set(value);
    if (value) this.errors.update(({ terms, ...rest }) => rest);
  }

  protected saveDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.draftKey, JSON.stringify({ form: this.form, selectedPlan: this.selectedPlan(), appearance: this.appearance(), logo: this.logo(), cover: this.cover() }));
      this.draftError.set('');
    } catch {
      this.draftError.set('Your changes are kept in this session, but could not be saved on this device.');
    }
  }

  protected discardDraft(): void {
    this.form = { storeName: '', category: '', location: '', phoneNumber: '', storeDescription: '' };
    this.categoryQuery.set('');
    this.appearance.set({ ...DEFAULT_STORE_APPEARANCE });
    this.logo.set('');
    this.cover.set('');
    this.imageRequest.logo++;
    this.imageRequest.cover++;
    this.imageError.set('');
    this.draftError.set('');
    this.selectedPlan.set('STARTER');
    this.selectedPayment.set('FREE');
    this.draftRestored.set(false);
    this.errors.set({});
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.draftKey);
  }

  protected async createStore(): Promise<void> {
    if (!this.validateStep(4)) return;
    this.submitting.set(true);
    this.submitError.set('');

    try {
      const plan = this.selectedPlan();
      const store = await firstValueFrom(this.sellerService.createStore({
        storeName: this.form.storeName.trim(),
        storeDescription: this.form.storeDescription.trim(),
        category: this.form.category,
        location: this.form.location,
        phoneNumber: this.fullPhoneNumber(),
        subscriptionPlan: plan,
        paymentMethod: plan === 'STARTER' ? 'FREE' : 'ABA',
        appearance: this.appearance(),
        ...(this.logo() ? { logoUrl: this.logo() } : {}),
        ...(this.cover() ? { bannerUrl: this.cover() } : {}),
      }));

      this.createdStore.set(store);
      if (typeof localStorage !== 'undefined') localStorage.removeItem(this.draftKey);
      await firstValueFrom(this.auth.refreshCurrentUser());

      // A paid plan is not granted by choosing it — the server creates every
      // store on STARTER and only upgrades once ABA confirms payment. So send
      // the seller straight to the KHQR rather than to a success screen that
      // would imply they are already on the plan they picked.
      if (plan !== 'STARTER') {
        await this.router.navigate(['/seller/plan/pay'], {
          queryParams: { store: store.id, plan },
        });
        return;
      }

      this.step.set(5);
      this.scrollToTop();
    } catch (error: unknown) {
      this.submitError.set(apiErrorMessage(error, 'We could not create your store. Check your details and try again.'));
    } finally {
      this.submitting.set(false);
    }
  }

  protected openDashboard(): void {
    const store = this.createdStore();
    void this.router.navigate(['/seller/dashboard'], { queryParams: store ? { storeId: store.id } : undefined });
  }

  protected storeRoute(): string[] {
    const store = this.createdStore();
    return ['/stores', store?.slug || store?.id || ''];
  }

  protected fieldError(name: string): string {
    return this.errors()[name] ?? '';
  }

  protected fullPhoneNumber(): string {
    const localNumber = this.form.phoneNumber.trim().replace(/^\+?855\s*/, '');
    return `+855 ${localNumber}`;
  }

  private validateStep(step: OnboardingStep): boolean {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (this.form.storeName.trim().length < 2) errors['storeName'] = 'Enter a store name with at least 2 characters.';
      if (!this.form.category) errors['category'] = 'Choose the main category for this store.';
      if (!this.form.location) errors['location'] = 'Choose where this store operates.';
      if (!/^\+?[0-9\s-]{8,30}$/.test(this.form.phoneNumber.trim())) errors['phoneNumber'] = 'Enter a valid contact number.';
    }
    if (step === 2 && this.imageLoading()) errors['storeDescription'] = 'Please wait for your image to finish loading.';
    if (step === 4 && !this.termsAccepted()) errors['terms'] = 'Please accept the seller terms before creating the store.';
    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  private restoreDraft(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(this.draftKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { form?: Partial<StoreDraft>; selectedPlan?: PlanKey; appearance?: StoreAppearance; logo?: string; cover?: string };
      this.form = { ...this.form, ...saved.form };
      const appearance = saved.appearance;
      if (appearance && this.styles.some(style => style.id === appearance.style) && this.fonts.some(font => font.id === appearance.font)
        && /^#[0-9a-f]{6}$/i.test(appearance.brandColor) && Number.isFinite(appearance.shade)
        && appearance.shade >= -60 && appearance.shade <= 60) this.appearance.set(appearance);
      if (saved.logo?.startsWith('data:image/jpeg;base64,')) this.logo.set(saved.logo);
      if (saved.cover?.startsWith('data:image/jpeg;base64,')) this.cover.set(saved.cover);
      if (saved.selectedPlan && this.plans.some((plan) => plan.key === saved.selectedPlan)) this.selectPlan(saved.selectedPlan);
      this.draftRestored.set(Boolean(this.form.storeName || this.form.storeDescription));
    } catch {
      localStorage.removeItem(this.draftKey);
    }
  }

  private applyEntryContext(): void {
    const params = this.route.snapshot.queryParamMap;
    const plan = params.get('plan') as PlanKey | null;
    if (plan && this.plans.some((item) => item.key === plan)) this.selectPlan(plan);

    const entryValues: Partial<StoreDraft> = {
      storeName: params.get('storeName') ?? undefined,
      category: params.get('category') ?? undefined,
      location: params.get('location') ?? undefined,
      phoneNumber: params.get('phoneNumber')?.replace(/^\+?855\s*/, '') ?? undefined,
    };
    for (const [key, value] of Object.entries(entryValues) as Array<[keyof StoreDraft, string | undefined]>) {
      if (value && !this.form[key]) this.form[key] = value;
    }
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
