import { Component, signal } from '@angular/core';
import { of } from 'rxjs';
import { SellerOnboardingPage, ONBOARDING_DRAFT_KEY } from './seller-onboarding';
import { AuthService } from '../../../core/auth/auth.service';
import { SellerService } from '../../../core/api/seller.service';
@Component({
  selector: 'app-storefront-preview-fixture',
  imports: [SellerOnboardingPage],
  providers: [
    { provide: ONBOARDING_DRAFT_KEY, useValue: 'khmercraft.storefront-visual-test' },
    { provide: AuthService, useValue: { user: signal(null) } },
    { provide: SellerService, useValue: { getMyStores: () => of([]) } },
  ],
  template: '<app-seller-onboarding />',
})
export class StorefrontPreviewFixture {}
