import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer style="background:#ecefeb; border-top:1px solid #dce3dc; color:#374151;">
      <div class="container-max" style="padding:32px 1.5rem 28px;">
        <div style="display:grid; grid-template-columns:1.6fr 1fr 1fr 1.6fr; gap:40px;">

          <!-- Brand col -->
          <div>
            <a routerLink="/" style="display:inline-block; text-decoration:none; margin-bottom:14px;">
              <span style="font-size:20px; font-weight:800; color:#1b4332; letter-spacing:-0.02em;">KhmerCraft</span>
            </a>
            <p style="font-size:13px; line-height:1.55; color:#6b7280; margin:0 0 20px; max-width:210px;">
              Empowering the artisans of Cambodia to share their unique heritage with the global community.
            </p>
            <div style="display:flex; gap:10px;">
              <!-- Facebook -->
              <a href="#" aria-label="Facebook"
                style="width:30px;height:30px;border-radius:50%;background:#f5f7f4;border:1px solid #d7ddd6;display:flex;align-items:center;justify-content:center;color:#374151;text-decoration:none;transition:background 0.15s;"
                onmouseover="this.style.background='#1b4332';this.style.color='white'"
                onmouseout="this.style.background='#f5f7f4';this.style.color='#374151'">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <!-- Instagram -->
              <a href="#" aria-label="Instagram"
                style="width:30px;height:30px;border-radius:50%;background:#f5f7f4;border:1px solid #d7ddd6;display:flex;align-items:center;justify-content:center;color:#374151;text-decoration:none;transition:background 0.15s;"
                onmouseover="this.style.background='#1b4332';this.style.color='white'"
                onmouseout="this.style.background='#f5f7f4';this.style.color='#374151'">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
              <!-- LinkedIn -->
              <a href="#" aria-label="LinkedIn"
                style="width:30px;height:30px;border-radius:50%;background:#f5f7f4;border:1px solid #d7ddd6;display:flex;align-items:center;justify-content:center;color:#374151;text-decoration:none;transition:background 0.15s;"
                onmouseover="this.style.background='#1b4332';this.style.color='white'"
                onmouseout="this.style.background='#f5f7f4';this.style.color='#374151'">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Company col -->
          <div>
            <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#111827; margin:0 0 16px;">Company</h4>
            <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">
              <li><a routerLink="/about" style="font-size:13.5px; color:#6b7280; text-decoration:none; transition:color 0.12s;"
                onmouseover="this.style.color='#1b4332'" onmouseout="this.style.color='#6b7280'">Our Mission</a></li>
              <li><a href="#" style="font-size:13.5px; color:#6b7280; text-decoration:none; transition:color 0.12s;"
                onmouseover="this.style.color='#1b4332'" onmouseout="this.style.color='#6b7280'">Artisan Stories</a></li>
              <li><a href="#" style="font-size:13.5px; color:#6b7280; text-decoration:none; transition:color 0.12s;"
                onmouseover="this.style.color='#1b4332'" onmouseout="this.style.color='#6b7280'">Careers</a></li>
              <li><a href="#" style="font-size:13.5px; color:#6b7280; text-decoration:none; transition:color 0.12s;"
                onmouseover="this.style.color='#1b4332'" onmouseout="this.style.color='#6b7280'">Blog</a></li>
            </ul>
          </div>

          <!-- Support col -->
          <div>
            <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#111827; margin:0 0 16px;">Support</h4>
            <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">
              <li><a href="#" style="font-size:13.5px; color:#6b7280; text-decoration:none; transition:color 0.12s;"
                onmouseover="this.style.color='#1b4332'" onmouseout="this.style.color='#6b7280'">Shipping Policy</a></li>
              <li><a href="#" style="font-size:13.5px; color:#6b7280; text-decoration:none; transition:color 0.12s;"
                onmouseover="this.style.color='#1b4332'" onmouseout="this.style.color='#6b7280'">Contact Support</a></li>
              <li><a href="#faq" style="font-size:13.5px; color:#6b7280; text-decoration:none; transition:color 0.12s;"
                onmouseover="this.style.color='#1b4332'" onmouseout="this.style.color='#6b7280'">FAQ</a></li>
            </ul>
          </div>

          <!-- Newsletter col -->
          <div>
            <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#111827; margin:0 0 16px;">Newsletter</h4>
            <p style="font-size:13px; color:#6b7280; line-height:1.65; margin:0 0 14px;">
              Stay updated on new collections and artisan stories.
            </p>
            <form (submit)="$event.preventDefault()" style="display:flex; gap:8px;">
              <input
                type="email"
                placeholder="Email address"
                style="flex:1; border:1px solid #d1d5db; border-radius:8px; background:white; padding:9px 14px; font-size:13px; color:#111827; outline:none; transition:border-color 0.15s;"
                onfocus="this.style.borderColor='#1b4332'"
                onblur="this.style.borderColor='#d1d5db'"
              />
              <button
                type="submit"
                style="background:#1b4332; color:white; border:none; border-radius:8px; padding:9px 18px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; transition:background 0.15s;"
                onmouseover="this.style.background='#2d6a4f'"
                onmouseout="this.style.background='#1b4332'"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <!-- Bottom bar -->
        <div style="margin-top:44px; padding-top:20px; border-top:1px solid #d9ddd7; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <p style="font-size:12px; color:#6f7773; margin:0;">&copy; 2024 KhmerCraft. Preserving Cambodian Heritage.</p>
          <div style="display:flex; gap:20px;">
            <a href="#" style="font-size:12px; color:#9ca3af; text-decoration:none;"
              onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#9ca3af'">Privacy Policy</a>
            <a href="#" style="font-size:12px; color:#9ca3af; text-decoration:none;"
              onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#9ca3af'">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class AppFooter {}
