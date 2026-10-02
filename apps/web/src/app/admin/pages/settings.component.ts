import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../admin-data.service';
import { AuthService, apiErrorMessage } from '../../core/auth/auth.service';

const PROFILE_KEY = 'khmercraft.admin.profile';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
  <div class="page-head"><div><h1 class="page-title">Account settings</h1><p class="page-sub">Manage the single platform administrator account</p></div></div>
  <div class="grid half">
    <section class="card card-pad">
      <h3 class="card-title">Profile</h3><p class="muted" style="margin:5px 0 16px">Personal details shown in the Admin workspace.</p>
      <div class="form-row"><label>Display name</label><input class="input" [value]="profileName()" (input)="profileName.set($any($event.target).value)" /></div>
      <div class="form-row"><label>Email</label><input class="input" [value]="auth.user()?.email || 'admin@khmercraft.com'" disabled /></div>
      <button class="btn btn-primary" [disabled]="!profileName().trim()" (click)="saveProfile()">Save profile</button>
    </section>
    <section class="card card-pad">
      <h3 class="card-title">Username</h3><p class="muted" style="margin:5px 0 16px">The local Admin handle used in this workspace.</p>
      <div class="form-row"><label>Username</label><input class="input" [value]="username()" (input)="username.set($any($event.target).value)" /></div>
      <button class="btn btn-primary" [disabled]="!username().trim()" (click)="saveUsername()">Save username</button>
      <p class="cell-sub" style="margin-top:12px">Username editing is stored locally until the admin profile API exists.</p>
    </section>
    <section class="card card-pad">
      <h3 class="card-title">Change password</h3><p class="muted" style="margin:5px 0 16px">Use your current password to update the protected Admin account.</p>
      <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
        <div class="form-row"><label>Current password</label><input class="input" type="password" formControlName="current" autocomplete="current-password" /></div>
        <div class="form-row"><label>New password</label><input class="input" type="password" formControlName="next" autocomplete="new-password" /><small class="cell-sub">At least 8 characters with upper, lower, and numeric characters.</small></div>
        <div class="form-row"><label>Confirm new password</label><input class="input" type="password" formControlName="confirm" autocomplete="new-password" /></div>
        @if (passwordError()) { <p class="form-error">{{passwordError()}}</p> }
        @if (passwordSuccess()) { <p class="success-text">{{passwordSuccess()}}</p> }
        <button class="btn btn-primary" type="submit" [disabled]="passwordForm.invalid || savingPassword()">{{savingPassword() ? 'Updating…' : 'Update password'}}</button>
      </form>
    </section>
  </div>`,
})
export class SettingsComponent {
  d = inject(AdminService);
  auth = inject(AuthService);
  profileName = signal('Admin');
  username = signal('admin');
  savingPassword = signal(false);
  passwordError = signal('');
  passwordSuccess = signal('');
  passwordForm = new FormGroup({
    current: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    next: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)] }),
    confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  constructor() {
    try {
      const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      if (stored.name) this.profileName.set(stored.name);
      if (stored.username) this.username.set(stored.username);
    } catch { /* local profile is optional */ }
  }
  saveProfile() { this.persistProfile(); this.d.log('Updated Admin profile', 'active'); this.d.toast('Profile saved'); }
  saveUsername() { this.persistProfile(); this.d.log('Updated Admin username', 'active'); this.d.toast('Username saved'); }
  private persistProfile() { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: this.profileName().trim(), username: this.username().trim() })); }
  changePassword() {
    const value = this.passwordForm.getRawValue();
    this.passwordError.set(''); this.passwordSuccess.set('');
    if (this.passwordForm.invalid || value.next !== value.confirm) { this.passwordForm.markAllAsTouched(); this.passwordError.set(value.next !== value.confirm ? 'New passwords do not match.' : 'Complete all password fields correctly.'); return; }
    this.savingPassword.set(true);
    this.auth.changePassword(value.current, value.next, value.confirm).pipe(finalize(() => this.savingPassword.set(false))).subscribe({
      next: () => { this.passwordForm.reset(); this.passwordSuccess.set('Password updated successfully.'); this.d.log('Changed Admin password', 'active'); },
      error: e => this.passwordError.set(apiErrorMessage(e, 'Could not update the password.')),
    });
  }
}
