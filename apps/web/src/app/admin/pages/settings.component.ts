import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../admin-data.service';
import { AuthService, apiErrorMessage } from '../../core/auth/auth.service';
import { IconComponent } from '../ui/icon.component';

const PROFILE_KEY = 'khmercraft.admin.profile';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
  <div class="page-head"><div><span class="eyebrow">System · Access</span><h1 class="page-title">Account settings</h1><p class="page-sub">Manage the single platform administrator account.</p></div></div>
  <div class="settings-workspace">
    <aside class="settings-rail" role="tablist" aria-label="Account settings sections">
      <div class="rail-heading">Account</div>
      <button type="button" role="tab" class="rail-link" [class.active]="settingsTab() === 'profile'" [attr.aria-selected]="settingsTab() === 'profile'" (click)="settingsTab.set('profile')"><kc-icon name="users" [size]="15"></kc-icon><span><b>Profile</b><small>Personal details</small></span></button>
      <button type="button" role="tab" class="rail-link" [class.active]="settingsTab() === 'security'" [attr.aria-selected]="settingsTab() === 'security'" (click)="settingsTab.set('security')"><kc-icon name="shield" [size]="15"></kc-icon><span><b>Security</b><small>Password access</small></span></button>
    </aside>

    <div class="settings-main">
      @if (settingsTab() === 'profile') {
      <section id="profile-settings" class="settings-card" role="tabpanel">
        <header class="settings-card-head profile-summary">
          <div class="profile-avatar">{{profileName().trim().charAt(0) || 'A'}}</div>
          <div><h2>Profile information</h2><p>Details displayed across your administration workspace.</p></div>
        </header>
        <div class="settings-card-body">
          <div class="form-row"><label for="admin-display-name">Display name</label><input id="admin-display-name" class="input" [value]="profileName()" (input)="profileName.set($any($event.target).value)" /></div>
          <div class="form-row"><label for="admin-email">Email address</label><input id="admin-email" class="input" [value]="auth.user()?.email || 'admin@khmercraft.com'" disabled /><small class="field-help"><kc-icon name="shield" [size]="12"></kc-icon>Managed by the administrator authentication account</small></div>
        </div>
        <footer class="settings-card-foot"><span>Changes affect the name shown in Admin.</span><button class="btn btn-primary" [disabled]="!profileName().trim()" (click)="saveProfile()">Save changes</button></footer>
      </section>
      } @else {
      <section id="security-settings" class="settings-card" role="tabpanel">
        <header class="settings-card-head"><div class="section-icon"><kc-icon name="shield" [size]="18"></kc-icon></div><div><h2>Password & security</h2><p>Choose a strong password to protect administrator access.</p></div></header>
        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
          <div class="settings-card-body">
            <div class="form-row"><label for="current-password">Current password</label><input id="current-password" class="input" type="password" formControlName="current" autocomplete="current-password" /></div>
            <div class="password-grid">
              <div class="form-row"><label for="new-password">New password</label><input id="new-password" class="input" type="password" formControlName="next" autocomplete="new-password" aria-describedby="password-requirements" /></div>
              <div class="form-row"><label for="confirm-password">Confirm password</label><input id="confirm-password" class="input" type="password" formControlName="confirm" autocomplete="new-password" /></div>
            </div>
            <div id="password-requirements" class="password-note"><kc-icon name="check" [size]="13"></kc-icon><span>Minimum 8 characters with uppercase, lowercase, and a number.</span></div>
            @if (passwordError()) { <p class="form-error" role="alert">{{passwordError()}}</p> }
            @if (passwordSuccess()) { <p class="success-text" role="status">{{passwordSuccess()}}</p> }
          </div>
          <footer class="settings-card-foot"><span>You will keep your current session after updating.</span><button class="btn btn-primary" type="submit" [disabled]="passwordForm.invalid || savingPassword()">{{savingPassword() ? 'Updating…' : 'Update password'}}</button></footer>
        </form>
      </section>
      }
    </div>
  </div>`,
  styles: [`
    .settings-workspace{display:grid;grid-template-columns:190px minmax(0,760px);align-items:start;gap:26px;max-width:980px}
    .settings-rail{position:sticky;top:94px;padding:10px 0}
    .rail-heading{padding:0 11px 9px;color:var(--muted);font-size:9px;font-weight:750;letter-spacing:.12em;text-transform:uppercase}
    .rail-link{display:flex;align-items:center;gap:10px;width:100%;padding:10px 11px;border:0;border-left:2px solid transparent;background:transparent;color:var(--muted);font:inherit;text-align:left;cursor:pointer;transition:.18s ease}
    .rail-link:hover{border-left-color:var(--line-2);background:#efebe8;color:var(--ink)}
    .rail-link.active{border-left-color:var(--accent);background:var(--accent-050);color:var(--accent)}
    .rail-link>span{display:flex;min-width:0;flex-direction:column;line-height:1.35}
    .rail-link b{font-size:11.5px;font-weight:650}.rail-link small{font-size:9.5px;color:var(--muted)}
    .settings-main{display:grid;gap:16px}
    .settings-card{overflow:hidden;border:1px solid var(--line);border-radius:9px;background:var(--surface)}
    .settings-card-head{display:flex;align-items:center;gap:13px;padding:20px 22px;border-bottom:1px solid var(--line);background:#faf9f7}
    .settings-card-head h2{margin:0 0 3px;font-size:14px;font-weight:700;letter-spacing:-.01em}
    .settings-card-head p{margin:0;color:var(--muted);font-size:11px}
    .profile-avatar,.section-icon{display:grid;place-items:center;flex:0 0 auto;color:var(--accent)}
    .profile-avatar{width:42px;height:42px;border-radius:9px;background:var(--accent);color:#fff;font-size:15px;font-weight:750}
    .section-icon{width:38px;height:38px;border:1px solid #ead7da;border-radius:8px;background:var(--accent-050)}
    .settings-card-body{padding:22px;max-width:650px}
    .form-row{margin-bottom:17px}.form-row:last-child{margin-bottom:0}
    .field-help{display:flex;align-items:center;gap:5px;margin-top:6px;color:var(--muted);font-size:10px}
    .password-grid{display:grid;grid-template-columns:1fr;gap:0}.password-grid .form-row{margin-bottom:17px}.password-grid .form-row:last-child{margin-bottom:0}
    .password-note{display:flex;align-items:center;gap:7px;margin-top:10px;padding:9px 10px;border-radius:5px;background:#f4f2ef;color:var(--muted);font-size:10px}
    .password-note kc-icon{color:var(--green)}
    .settings-card-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 22px;border-top:1px solid var(--line);background:#faf9f7}
    .settings-card-foot>span{color:var(--muted);font-size:10px}
    .form-error,.success-text{margin:14px 0 0}
    @media(max-width:760px){
      .settings-workspace{grid-template-columns:1fr;gap:14px}
      .settings-rail{position:static;display:flex;gap:4px;overflow-x:auto;padding:0 0 2px}
      .rail-heading{display:none}.rail-link{width:auto;min-width:max-content;border:0;border-bottom:2px solid transparent;padding:8px 10px}.rail-link.active{border-left:0;border-bottom-color:var(--accent)}
      .rail-link small{display:none}
    }
    @media(max-width:520px){
      .settings-card-head,.settings-card-body{padding:17px}
      .settings-card-foot{align-items:stretch;flex-direction:column;padding:13px 17px}.settings-card-foot .btn{width:100%}
    }
  `],
})
export class SettingsComponent {
  d = inject(AdminService);
  auth = inject(AuthService);
  settingsTab = signal<'profile' | 'security'>('profile');
  profileName = signal('Admin');
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
    } catch { /* local profile is optional */ }
  }
  saveProfile() { this.persistProfile(); this.d.log('Updated Admin profile', 'active'); this.d.toast('Profile saved'); }
  private persistProfile() { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: this.profileName().trim() })); }
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
