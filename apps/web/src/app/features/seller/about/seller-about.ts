import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SellerFooter } from '../shared/seller-footer';
import { SellerPortalHeader } from '../shared/seller-portal-header';

@Component({
  selector: 'app-seller-about',
  imports: [RouterLink, SellerPortalHeader, SellerFooter],
  template: `
    <app-seller-portal-header />
    <main>
      <section class="hero">
        <p class="eyebrow">KhmerCraft Seller</p>
        <h1>A marketplace built for Cambodia’s sellers.</h1>
        <p>KhmerCraft Seller gives local businesses one place to create a storefront, publish products, and manage orders while customers shop in the marketplace.</p>
        <a routerLink="/seller/onboarding">Start your store</a>
      </section>
      <section class="principles" aria-label="What KhmerCraft Seller offers">
        <article><b>01</b><h2>Your store, your story</h2><p>Set your name, products, pricing, and shop details in a storefront customers can find and trust.</p></article>
        <article><b>02</b><h2>Everything in one workspace</h2><p>Keep products, stock, incoming orders, and customer feedback together instead of across separate chats.</p></article>
        <article><b>03</b><h2>Ready when you are</h2><p>Create your store for free, save drafts while you work, and publish when your listing is ready.</p></article>
      </section>
    </main>
    <app-seller-footer />
  `,
  styles: [`
    main{background:#fcfaf5;color:#2b2721}.hero{background:linear-gradient(120deg,#f5eee4,#fffdf9 58%,#edf4ed);padding:clamp(58px,9vw,120px) 24px;text-align:center}.hero>*{margin-left:auto;margin-right:auto}.eyebrow{color:#9b3827;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.hero h1{font-family:var(--font-heading);font-size:clamp(38px,5vw,66px);font-weight:600;letter-spacing:-.04em;line-height:1.05;max-width:760px;margin-top:15px;margin-bottom:20px}.hero p:not(.eyebrow){color:#675f55;font-size:17px;line-height:1.6;max-width:610px}.hero a{background:#213b30;border-radius:8px;color:#fff;display:inline-block;font-size:14px;font-weight:800;margin-top:28px;padding:13px 22px;text-decoration:none}.principles{display:grid;gap:18px;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 auto;max-width:1160px;padding:clamp(46px,7vw,86px) 24px}.principles article{border:1px solid #e6ddd1;border-radius:14px;background:#fff;padding:25px}.principles b{color:#9b3827;font-size:12px;letter-spacing:.1em}.principles h2{font-family:var(--font-heading);font-size:23px;margin:15px 0 9px}.principles p{color:#6b645a;font-size:14px;line-height:1.6;margin:0}@media(max-width:720px){.principles{grid-template-columns:1fr}.hero p:not(.eyebrow){font-size:16px}}
  `],
})
export class SellerAbout {}
