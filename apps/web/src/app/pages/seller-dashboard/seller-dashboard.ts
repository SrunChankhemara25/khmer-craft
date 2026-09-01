import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../../core/api/api.config';
import { KcIcon } from '../../components/ui/kc-icon';
import { SellerService } from '../../core/api/seller.service';
import { AuthService } from '../../core/auth/auth.service';
import { CommerceApiService } from '../../core/api/commerce-api.service';
import { OrderStatus } from '../../core/api/api.models';
import { cartErrorMessage } from '../../core/cart/cart.service';

type DashboardView = 'dashboard' | 'products' | 'add' | 'orders' | 'profile' | 'sales' | 'reviews' | 'settings';
type OrderStatusClass = 'pending' | 'shipped' | 'delivered';

interface SellerOrder {
  id: string;
  buyer: string;
  initials: string;
  color: string;
  product: string;
  qty: number;
  total: string;
  address: string;
  date: string;
  status: string;
  statusClass: OrderStatusClass;
  phone: string;
  note: string;
  paymentMethod: string;
  paymentStatus: string;
  items: {
    name: string;
    image: string | null;
    qty: number;
    price: number;
    subtotal: number;
  }[];
}

interface DashboardMetric {
  label: string;
  value: string;
  icon: string;
  note?: string;
  warn?: boolean;
  gold?: boolean;
}

@Component({
  selector: 'app-seller-dashboard',
  imports: [KcIcon, FormsModule],
  styles: [`
    :host {
      background: #f8f4ec;
      color: #26302c;
      display: block;
      min-height: 100vh;
    }

    .portal {
      display: grid;
      grid-template-columns: 230px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      background: #f5f7fb;
      border-right: 1px solid #dce4e3;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 25px 0 30px;
    }

    .logo {
      color: #146242;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1;
      margin: 0 24px 3px;
    }

    .portal-label {
      color: #7b8782;
      font-size: 11px;
      font-weight: 700;
      margin: 0 24px 35px;
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav button,
    .logout {
      align-items: center;
      background: transparent;
      border: 0;
      color: #53605b;
      cursor: pointer;
      display: flex;
      font-size: 14px;
      font-weight: 750;
      gap: 12px;
      min-height: 47px;
      padding: 0 22px;
      position: relative;
      text-align: left;
      width: 100%;
    }

    .nav button:hover {
      background: rgba(21, 95, 64, 0.06);
      color: #146242;
    }

    .nav button.active {
      background: #eaf2ff;
      color: #146242;
    }

    .nav button.active::after {
      background: #146242;
      border-radius: 999px;
      content: "";
      height: 47px;
      position: absolute;
      right: 0;
      top: 0;
      width: 4px;
    }

    .logout {
      color: #c33d35;
      margin-top: auto;
    }

    .content {
      min-width: 0;
    }

    .topbar {
      align-items: center;
      background: #fff;
      border-bottom: 1px solid #ded8cd;
      display: flex;
      gap: 28px;
      height: 58px;
      justify-content: space-between;
      padding: 0 24px;
    }

    .search {
      align-items: center;
      background: #fff;
      border: 1px solid #cfd8cf;
      border-radius: 6px;
      color: #7a8580;
      display: flex;
      flex: 1;
      gap: 11px;
      height: 39px;
      max-width: 560px;
      padding: 0 13px;
    }

    .search input {
      border: 0;
      color: #303a36;
      flex: 1;
      font-size: 13px;
      font-weight: 650;
      outline: none;
    }

    .search input::placeholder {
      color: #9aa39f;
    }

    .top-actions {
      align-items: center;
      display: flex;
      gap: 22px;
    }

    .view-store {
      align-items: center;
      background: #fff;
      border: 1px solid #cfd8cf;
      border-radius: 5px;
      color: #4f5b56;
      display: flex;
      font-size: 13px;
      font-weight: 800;
      gap: 8px;
      height: 39px;
      padding: 0 17px;
      text-decoration: none;
    }

    .seller-mini {
      align-items: center;
      display: flex;
      gap: 12px;
    }

    .seller-mini img,
    .avatar {
      border-radius: 50%;
      height: 36px;
      object-fit: cover;
      width: 36px;
    }

    .seller-mini strong {
      display: block;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.1;
    }

    .seller-mini span {
      color: #7a8580;
      display: block;
      font-size: 10px;
      font-weight: 750;
    }

    .page {
      padding: 30px 28px 52px;
    }

    .page h1 {
      color: #1f2a33;
      font-size: 31px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1;
      margin: 0 0 8px;
    }

    .muted {
      color: #6e7974;
      font-size: 13px;
      font-weight: 650;
      margin: 0;
    }

    .orders-head {
      align-items: end;
      display: flex;
      gap: 20px;
      justify-content: space-between;
      margin-bottom: 28px;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      align-items: center;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      font-size: 13px;
      font-weight: 850;
      gap: 8px;
      height: 40px;
      justify-content: center;
      padding: 0 17px;
    }

    .btn-ghost {
      background: #fff;
      border: 1px solid #d7dbd4;
      color: #4f5b56;
    }

    .btn-primary {
      background: #146242;
      border: 1px solid #146242;
      color: #fff;
    }

    .metrics {
      display: grid;
      gap: 22px;
      grid-template-columns: repeat(4, 1fr);
      margin-bottom: 20px;
    }

    .metric {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      min-height: 119px;
      padding: 18px 18px 16px;
    }

    .metric-icon {
      align-items: center;
      background: #e9f6ef;
      border-radius: 7px;
      color: #146242;
      display: flex;
      height: 34px;
      justify-content: center;
      margin-bottom: 14px;
      width: 34px;
    }

    .metric.warn .metric-icon {
      background: #fbe7d2;
      color: #93612f;
    }

    .metric.gold .metric-icon {
      background: #fbefc9;
      color: #a66a00;
    }

    .metric-label {
      color: #59635f;
      display: block;
      font-size: 12px;
      font-weight: 800;
    }

    .metric strong {
      color: #1f2a33;
      display: block;
      font-size: 24px;
      font-weight: 900;
      line-height: 1;
      margin-top: 5px;
    }

    .filters,
    .table-card,
    .review-card,
    .rating-card {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
    }

    .filters {
      align-items: end;
      display: grid;
      gap: 18px;
      grid-template-columns: 1.4fr 0.7fr 0.7fr auto;
      margin-bottom: 18px;
      padding: 18px;
    }

    .field label {
      color: #59635f;
      display: block;
      font-size: 10px;
      font-weight: 850;
      margin-bottom: 8px;
    }

    .field-control {
      align-items: center;
      border: 1px solid #d8ddd6;
      border-radius: 5px;
      color: #7a8580;
      display: flex;
      font-size: 12px;
      font-weight: 700;
      gap: 8px;
      height: 38px;
      padding: 0 12px;
    }

    .reset {
      background: transparent;
      border: 0;
      color: #146242;
      cursor: pointer;
      font-size: 12px;
      font-weight: 850;
      height: 38px;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    th {
      background: #f6f1e8;
      color: #4f5b56;
      font-size: 12px;
      font-weight: 900;
      padding: 17px 18px;
      text-align: left;
    }

    td {
      border-top: 1px solid #eee8df;
      color: #404b46;
      font-size: 12px;
      font-weight: 700;
      padding: 16px 18px;
      vertical-align: middle;
    }

    .order-id {
      color: #146242;
      cursor: pointer;
      font-weight: 900;
    }

    .buyer {
      align-items: center;
      display: flex;
      gap: 10px;
    }

    .initial {
      align-items: center;
      border-radius: 50%;
      color: #fff;
      display: flex;
      font-size: 10px;
      font-weight: 900;
      height: 25px;
      justify-content: center;
      width: 25px;
    }

    .status {
      border-radius: 999px;
      display: inline-flex;
      font-size: 10px;
      font-weight: 900;
      justify-content: center;
      min-width: 88px;
      padding: 7px 12px;
      text-transform: uppercase;
    }

    .pending {
      background: #dca80d;
      color: #fff;
    }

    .shipped {
      background: #dce9fb;
      color: #657383;
    }

    .delivered {
      background: #dcefe4;
      color: #357457;
    }

    .table-foot {
      align-items: center;
      border-top: 1px solid #eee8df;
      color: #69746f;
      display: flex;
      font-size: 12px;
      font-weight: 700;
      justify-content: space-between;
      padding: 15px 18px;
    }

    .pagination {
      display: flex;
      gap: 8px;
    }

    .pagination span {
      align-items: center;
      border: 1px solid #d8ddd6;
      border-radius: 5px;
      display: flex;
      height: 30px;
      justify-content: center;
      width: 30px;
    }

    .pagination .current {
      background: #146242;
      border-color: #146242;
      color: #fff;
    }

    .reviews-layout {
      max-width: 1400px;
    }

    .rating-row {
      display: grid;
      gap: 24px;
      grid-template-columns: 310px 1fr;
      margin: 28px 0;
    }

    .rating-card {
      padding: 25px 28px;
    }

    .average {
      text-align: center;
    }

    .average span {
      color: #6d7672;
      display: block;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .average strong {
      color: #146242;
      display: inline-block;
      font-size: 44px;
      font-weight: 900;
      line-height: 1;
      margin: 8px 0 5px;
    }

    .stars-large {
      color: #d88636;
      font-size: 19px;
      letter-spacing: 2px;
    }

    .dist h2 {
      color: #303a36;
      font-size: 15px;
      font-weight: 900;
      margin: 0 0 20px;
    }

    .bar-row {
      align-items: center;
      display: grid;
      gap: 12px;
      grid-template-columns: 58px 1fr 28px;
      margin-bottom: 12px;
    }

    .bar-row span {
      color: #59635f;
      font-size: 12px;
      font-weight: 700;
    }

    .track {
      background: #eaf2ff;
      border-radius: 999px;
      height: 8px;
      overflow: hidden;
    }

    .fill {
      background: #146242;
      height: 100%;
    }

    .fill.low {
      background: #e6ad69;
    }

    .review-tabs {
      align-items: center;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 22px;
    }

    .chips {
      display: flex;
      gap: 10px;
    }

    .chip {
      background: #fff;
      border: 1px solid #cfd8cf;
      border-radius: 999px;
      color: #59635f;
      font-size: 13px;
      font-weight: 800;
      padding: 10px 17px;
    }

    .chip.active {
      background: #146242;
      border-color: #146242;
      color: #fff;
    }

    .sort {
      color: #59635f;
      font-size: 12px;
      font-weight: 800;
    }

    .review-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .review-card {
      padding: 24px;
    }

    .review-top {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 13px;
    }

    .review-person {
      align-items: center;
      display: flex;
      gap: 14px;
    }

    .review-person .initial {
      color: #95652e;
      height: 46px;
      width: 46px;
    }

    .review-person h3 {
      color: #303a36;
      font-size: 14px;
      font-weight: 900;
      margin: 0 0 3px;
    }

    .review-person p,
    .date {
      color: #78817d;
      font-size: 11px;
      font-weight: 700;
      margin: 0;
    }

    .review-stars {
      color: #d88636;
      font-size: 14px;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .review-text {
      color: #4c5752;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.6;
      margin: 0 0 18px;
    }

    .response {
      background: #f7f3ec;
      border-radius: 5px;
      color: #59635f;
      font-size: 12px;
      font-style: italic;
      font-weight: 650;
      line-height: 1.55;
      padding: 18px;
    }

    .response strong {
      color: #146242;
      display: block;
      font-style: normal;
      margin-bottom: 5px;
    }

    .review-img {
      border-radius: 4px;
      display: block;
      height: 75px;
      margin-bottom: 16px;
      object-fit: cover;
      width: 75px;
    }

    .review-actions {
      color: #53605b;
      display: flex;
      font-size: 11px;
      font-weight: 800;
      gap: 14px;
    }

    .review-actions a {
      color: #146242;
      text-decoration: none;
    }

    .profile-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: 300px 1fr;
      margin-top: 28px;
      max-width: 1400px;
    }

    .seller-card,
    .completion-card,
    .profile-form,
    .settings-card,
    .danger-card,
    .payout-card,
    .how-card,
    .goal-card {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
    }

    .seller-card {
      overflow: hidden;
    }

    .banner {
      height: 142px;
      object-fit: cover;
      width: 100%;
    }

    .seller-card-body {
      padding: 0 22px 22px;
    }

    .store-logo-preview {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      height: 82px;
      margin-top: -42px;
      object-fit: cover;
      padding: 5px;
      position: relative;
      width: 82px;
    }

    .seller-card h2 {
      color: #26302c;
      font-size: 16px;
      font-weight: 900;
      margin: 14px 0 8px;
    }

    .store-rating {
      align-items: center;
      color: #59635f;
      display: flex;
      font-size: 12px;
      font-weight: 750;
      gap: 8px;
      margin-bottom: 18px;
    }

    .store-rating strong {
      color: #d88636;
    }

    .seller-card p {
      color: #59635f;
      font-size: 12px;
      font-weight: 650;
      line-height: 1.55;
      margin: 0 0 20px;
    }

    .completion-card {
      margin-top: 22px;
      padding: 21px;
    }

    .completion-head {
      align-items: center;
      display: flex;
      font-size: 12px;
      font-weight: 900;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .progress-line {
      background: #dfe9f6;
      border-radius: 999px;
      height: 8px;
      margin-bottom: 18px;
      overflow: hidden;
    }

    .progress-line span {
      background: #146242;
      display: block;
      height: 100%;
      width: 85%;
    }

    .check-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .check-list span {
      align-items: center;
      color: #59635f;
      display: flex;
      font-size: 12px;
      font-weight: 750;
      gap: 8px;
    }

    .profile-form {
      padding: 30px;
    }

    .upload-row {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 26px;
    }

    .upload-box {
      align-items: center;
      background: #f7f9fc;
      border: 1px dashed #9fb3ad;
      border-radius: 8px;
      color: #66736e;
      display: flex;
      flex-direction: column;
      font-size: 10px;
      font-weight: 800;
      gap: 7px;
      height: 136px;
      justify-content: center;
      text-align: center;
    }

    .upload-box .upload-icon {
      align-items: center;
      background: #dbe8e4;
      border-radius: 7px;
      color: #146242;
      display: flex;
      height: 55px;
      justify-content: center;
      width: 55px;
    }

    .upload-box strong {
      color: #146242;
      display: block;
      font-size: 11px;
    }

    .dash-form {
      display: flex;
      flex-direction: column;
      gap: 19px;
    }

    .dash-form label,
    .settings-card label {
      color: #59635f;
      display: block;
      font-size: 11px;
      font-weight: 850;
    }

    .dash-input,
    .dash-textarea {
      background: #fff;
      border: 1px solid #d8ddd6;
      border-radius: 5px;
      color: #2d3733;
      display: block;
      font-size: 13px;
      font-weight: 650;
      margin-top: 8px;
      outline: none;
      padding: 0 13px;
      width: 100%;
    }

    .dash-input {
      height: 43px;
    }

    .dash-textarea {
      min-height: 116px;
      padding-top: 13px;
      resize: vertical;
    }

    .two-cols {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 1fr;
    }

    .form-actions {
      display: flex;
      gap: 18px;
      justify-content: flex-end;
      margin-top: 14px;
    }

    .sales-grid {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 250px;
      margin-top: 28px;
    }

    .sales-main {
      min-width: 0;
    }

    .payout-head {
      align-items: center;
      display: flex;
      justify-content: space-between;
      padding: 22px 24px 12px;
    }

    .payout-head h2,
    .settings-card h2,
    .danger-card h2 {
      color: #26302c;
      font-size: 17px;
      font-weight: 900;
      margin: 0;
    }

    .payout-actions {
      display: flex;
      gap: 9px;
    }

    .money {
      color: #146242;
      font-weight: 900;
    }

    .commission {
      color: #b56c42;
    }

    .paid {
      background: #d9f5df;
      color: #2d8a52;
    }

    .how-card {
      background: #146242;
      color: #d7eadf;
      padding: 25px 22px;
    }

    .how-card h2 {
      color: #fff;
      font-size: 22px;
      font-weight: 900;
      margin: 0 0 16px;
    }

    .how-card p {
      font-size: 12px;
      font-weight: 650;
      line-height: 1.55;
      margin: 0 0 26px;
    }

    .calc-row {
      align-items: center;
      border-top: 1px solid rgba(255,255,255,0.14);
      display: flex;
      font-size: 13px;
      font-weight: 850;
      justify-content: space-between;
      padding: 14px 0;
    }

    .earning {
      background: rgba(255,255,255,0.14);
      border-radius: 5px;
      color: #b8ebcc;
      font-size: 24px;
      font-weight: 900;
      padding: 12px;
      text-align: right;
    }

    .info-note {
      align-items: flex-start;
      background: rgba(255,255,255,0.1);
      border-radius: 5px;
      display: flex;
      font-size: 11px;
      font-weight: 650;
      gap: 9px;
      line-height: 1.45;
      margin-top: 22px;
      padding: 13px;
    }

    .goal-card {
      margin-top: 20px;
      padding: 18px;
    }

    .goal-card h3 {
      font-size: 13px;
      font-weight: 900;
      margin: 0 0 4px;
    }

    .goal-card strong {
      color: #146242;
      float: right;
      font-size: 13px;
    }

    .settings-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: 1.2fr 0.8fr;
      margin-top: 28px;
    }

    .settings-card,
    .danger-card {
      padding: 25px;
    }

    .settings-card h2,
    .danger-card h2 {
      align-items: center;
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .toggle-row {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 23px;
    }

    .toggle-row strong {
      color: #26302c;
      display: block;
      font-size: 14px;
      font-weight: 900;
      margin-bottom: 4px;
    }

    .toggle-row span {
      color: #6e7974;
      font-size: 12px;
      font-weight: 650;
    }

    .switch {
      background: #146242;
      border-radius: 999px;
      height: 23px;
      position: relative;
      width: 45px;
    }

    .switch::after {
      background: #fff;
      border-radius: 50%;
      content: "";
      height: 17px;
      position: absolute;
      right: 3px;
      top: 3px;
      width: 17px;
    }

    .danger-card {
      background: #fff9f8;
      border-color: #f1d8d5;
    }

    .danger-card h2 {
      color: #c73030;
    }

    .danger-card > p {
      color: #7a5f5b;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.5;
      margin: -6px 0 22px;
    }

    .danger-action {
      align-items: center;
      background: #fff;
      border: 1px solid #f1d8d5;
      border-radius: 5px;
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      padding: 14px 16px;
    }

    .danger-action strong {
      color: #c73030;
      display: block;
      font-size: 13px;
      font-weight: 900;
    }

    .danger-action span {
      color: #7a5f5b;
      display: block;
      font-size: 11px;
      font-weight: 650;
      margin-top: 3px;
    }

    .danger-link {
      background: transparent;
      border: 0;
      color: #c73030;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
    }

    .danger-btn {
      background: #c73030;
      border: 0;
      border-radius: 5px;
      color: #fff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      height: 36px;
      padding: 0 14px;
    }

    .portal-version {
      color: #b3ada3;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin-top: 45px;
      text-align: center;
      text-transform: uppercase;
    }

    .dashboard-grid {
      display: grid;
      gap: 24px;
      grid-template-columns: 1fr 285px;
      margin-top: 28px;
    }

    .dash-main {
      min-width: 0;
    }

    .quick-actions {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(4, 1fr);
      margin-top: 22px;
    }

    .quick-action {
      align-items: center;
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      color: #26302c;
      display: flex;
      flex-direction: column;
      font-size: 11px;
      font-weight: 900;
      gap: 10px;
      justify-content: center;
      min-height: 105px;
      text-align: center;
    }

    .quick-action kc-icon {
      color: #1f2a33;
    }

    .low-stock-card,
    .goal-widget,
    .tip-card,
    .inventory-card,
    .product-preview,
    .pro-tip,
    .publish-card,
    .form-card {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
    }

    .low-stock-card {
      padding: 20px;
    }

    .low-stock-card h2,
    .goal-widget h2,
    .tip-card h2,
    .inventory-card h2 {
      color: #26302c;
      font-size: 15px;
      font-weight: 900;
      margin: 0 0 18px;
    }

    .critical {
      background: #ffd8d3;
      border-radius: 3px;
      color: #c73030;
      float: right;
      font-size: 9px;
      font-weight: 900;
      padding: 4px 8px;
      text-transform: uppercase;
    }

    .stock-item {
      align-items: center;
      display: grid;
      gap: 12px;
      grid-template-columns: 58px 1fr;
      margin-bottom: 18px;
    }

    .stock-item img {
      border-radius: 5px;
      height: 58px;
      object-fit: cover;
      width: 58px;
    }

    .stock-item strong {
      color: #26302c;
      display: block;
      font-size: 13px;
      font-weight: 900;
    }

    .stock-item span {
      color: #c73030;
      display: block;
      font-size: 12px;
      font-weight: 850;
      margin: 2px 0 8px;
    }

    .small-green {
      background: #146242;
      border: 0;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font-size: 10px;
      font-weight: 900;
      height: 28px;
      padding: 0 13px;
    }

    .goal-widget {
      margin-top: 24px;
      padding: 20px;
    }

    .goal-widget strong {
      color: #146242;
      display: block;
      font-size: 23px;
      font-weight: 900;
      margin-bottom: 8px;
    }

    .products-head {
      align-items: end;
      display: flex;
      justify-content: space-between;
      margin-bottom: 28px;
    }

    .product-filters {
      align-items: center;
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      display: grid;
      gap: 14px;
      grid-template-columns: 1fr 160px 120px 42px;
      margin-bottom: 22px;
      padding: 15px;
    }

    .product-thumb {
      border-radius: 5px;
      height: 58px;
      object-fit: cover;
      width: 58px;
    }

    .product-name strong {
      color: #26302c;
      display: block;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.2;
    }

    .product-name span {
      color: #7a8580;
      display: block;
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
    }

    .pill {
      border-radius: 999px;
      display: inline-flex;
      font-size: 10px;
      font-weight: 900;
      padding: 6px 13px;
      text-transform: uppercase;
    }

    .pill.blue {
      background: #dfeaf8;
      color: #5b6c80;
    }

    .pill.green {
      background: #d9f5df;
      color: #2d8a52;
    }

    .pill.yellow {
      background: #fde8ab;
      color: #a66a00;
    }

    .pill.red {
      background: #ffd8d3;
      color: #c73030;
    }

    .row-actions {
      display: flex;
      gap: 14px;
    }

    .icon-btn {
      background: transparent;
      border: 0;
      color: #4f5b56;
      cursor: pointer;
      padding: 0;
    }

    .product-insights {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 250px;
      margin-top: 24px;
    }

    .tip-card {
      background: #fdebd9;
      border-color: #f4dac1;
      display: grid;
      gap: 18px;
      grid-template-columns: 62px 1fr;
      padding: 25px;
    }

    .sparkle {
      align-items: center;
      background: #f4b879;
      border-radius: 50%;
      color: #8b5424;
      display: flex;
      height: 52px;
      justify-content: center;
      width: 52px;
    }

    .tip-card h2 {
      color: #9a6743;
      font-size: 18px;
      margin-bottom: 8px;
    }

    .tip-card p,
    .inventory-card p {
      color: #7b6353;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.45;
      margin: 0;
    }

    .inventory-card {
      background: #eef4e8;
      padding: 22px;
    }

    .inventory-card h2 {
      color: #146242;
      font-size: 14px;
      text-transform: uppercase;
    }

    .add-layout {
      display: grid;
      gap: 24px;
      grid-template-columns: 1fr 300px;
      margin-top: 36px;
    }

    .add-main {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-card {
      padding: 26px 28px;
    }

    .form-card h2 {
      align-items: center;
      color: #26302c;
      display: flex;
      font-size: 18px;
      font-weight: 900;
      gap: 9px;
      margin: 0 0 24px;
    }

    .required {
      color: #c73030;
    }

    .upload-drop {
      align-items: center;
      border: 1px dashed #cfd8cf;
      border-radius: 8px;
      color: #7a8580;
      display: flex;
      flex-direction: column;
      font-size: 13px;
      font-weight: 750;
      gap: 8px;
      justify-content: center;
      min-height: 170px;
      text-align: center;
    }

    .upload-drop kc-icon {
      color: #b4c1bc;
    }

    .upload-drop small {
      color: #8d9691;
      font-size: 11px;
      font-weight: 700;
    }

    .add-tile {
      align-items: center;
      background: #dfeeff;
      border: 0;
      border-radius: 5px;
      color: #9aa4a0;
      display: flex;
      font-size: 20px;
      height: 72px;
      justify-content: center;
      margin-top: 22px;
      width: 72px;
    }

    .publish-card {
      align-items: center;
      display: flex;
      justify-content: space-between;
      padding: 24px 28px;
    }

    .publish-card strong {
      color: #26302c;
      display: block;
      font-size: 13px;
      font-weight: 900;
    }

    .publish-card span {
      color: #6e7974;
      display: block;
      font-size: 12px;
      font-weight: 650;
      margin-top: 4px;
    }

    .add-side {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .preview-label {
      color: #6e7974;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .product-preview {
      overflow: hidden;
    }

    .product-preview img {
      display: block;
      height: 370px;
      object-fit: cover;
      width: 100%;
    }

    .preview-body {
      padding: 18px;
    }

    .preview-body small {
      color: #146242;
      display: block;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .preview-body h3 {
      color: #26302c;
      font-size: 14px;
      font-weight: 900;
      margin: 0 0 5px;
    }

    .preview-body p {
      color: #6e7974;
      font-size: 12px;
      font-weight: 700;
      margin: 0 0 18px;
    }

    .preview-price {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .preview-price strong {
      color: #146242;
      display: block;
      font-size: 14px;
      font-weight: 900;
    }

    .pro-tip {
      background: #fff4d8;
      border-color: #efd69c;
      color: #7b5a21;
      display: grid;
      gap: 12px;
      grid-template-columns: 30px 1fr;
      padding: 17px;
    }

    .sticky-save {
      align-items: center;
      background: rgba(255,255,255,0.9);
      border-top: 1px solid #e4ded3;
      bottom: 0;
      display: flex;
      justify-content: space-between;
      left: 230px;
      padding: 18px 28px;
      position: sticky;
      z-index: 5;
    }

    .autosave {
      color: #8a948f;
      font-size: 12px;
      font-weight: 750;
    }

    .placeholder {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      margin-top: 28px;
      padding: 80px 30px;
      text-align: center;
    }

    .placeholder h2 {
      color: #146242;
      font-size: 24px;
      font-weight: 900;
      margin: 0 0 10px;
    }

    .backdrop {
      align-items: center;
      backdrop-filter: blur(5px);
      background: rgba(245, 242, 235, 0.76);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: 24px;
      position: fixed;
      z-index: 20;
    }

    .modal {
      background: #fff;
      border: 1px solid #e4ded3;
      border-radius: 8px;
      box-shadow: 0 20px 55px rgba(31, 42, 51, 0.16);
      max-width: 680px;
      padding: 0;
      width: 100%;
    }

    .modal-head {
      align-items: center;
      border-bottom: 1px solid #ece5dc;
      display: flex;
      justify-content: space-between;
      padding: 22px 24px;
    }

    .modal-head h2 {
      color: #1f2a33;
      font-size: 22px;
      font-weight: 900;
      margin: 0;
    }

    .modal-head .status {
      margin-left: 11px;
    }

    .close {
      background: transparent;
      border: 0;
      color: #4c5752;
      cursor: pointer;
      font-size: 28px;
      line-height: 1;
    }

    .modal-body {
      padding: 24px;
    }

    .detail-grid {
      display: grid;
      gap: 22px;
      grid-template-columns: 1fr 0.86fr;
      margin-bottom: 24px;
    }

    .detail-panel {
      background: #f8f4ec;
      border-radius: 7px;
      padding: 19px;
    }

    .detail-title {
      align-items: center;
      color: #6b756f;
      display: flex;
      font-size: 12px;
      font-weight: 900;
      gap: 7px;
      letter-spacing: 0.06em;
      margin-bottom: 14px;
      text-transform: uppercase;
    }

    .info-line {
      display: grid;
      font-size: 12px;
      font-weight: 750;
      grid-template-columns: 85px 1fr;
      margin-bottom: 10px;
    }

    .info-line span:first-child {
      color: #6b756f;
    }

    .info-line span:last-child {
      color: #2c3732;
      text-align: right;
    }

    .note {
      color: #59635f;
      font-size: 12px;
      font-style: italic;
      font-weight: 800;
      line-height: 1.45;
      margin-top: 14px;
    }

    .product-detail {
      border: 1px solid #e4ded3;
      border-radius: 7px;
      margin-bottom: 24px;
      padding: 14px;
    }

    .product-line {
      align-items: center;
      display: grid;
      gap: 15px;
      grid-template-columns: 72px 1fr auto;
    }

    .product-line img {
      border-radius: 5px;
      height: 72px;
      object-fit: cover;
      width: 72px;
    }

    .product-line h3 {
      color: #26302c;
      font-size: 14px;
      font-weight: 900;
      margin: 0 0 4px;
    }

    .product-line p {
      color: #6b756f;
      font-size: 12px;
      font-weight: 700;
      margin: 0;
    }

    .subtotal {
      color: #26302c;
      font-size: 12px;
      font-weight: 900;
      text-align: right;
      text-transform: uppercase;
    }

    .subtotal strong {
      display: block;
      font-size: 15px;
      margin-top: 5px;
    }

    .modal-actions {
      display: grid;
      gap: 14px;
      grid-template-columns: 1fr auto auto;
    }

    select {
      border: 1px solid #d8ddd6;
      border-radius: 5px;
      color: #4c5752;
      font-size: 13px;
      font-weight: 750;
      height: 43px;
      padding: 0 12px;
    }

    @media (max-width: 980px) {
      .portal {
        grid-template-columns: 1fr;
      }

      .sidebar {
        min-height: auto;
      }

      .nav {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
      }

      .metrics,
      .filters,
      .rating-row,
      .detail-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 680px) {
      .topbar,
      .orders-head,
      .review-tabs {
        align-items: flex-start;
        flex-direction: column;
        height: auto;
        padding-bottom: 16px;
        padding-top: 16px;
      }

      .metrics,
      .filters,
      .rating-row,
      .detail-grid,
      .modal-actions {
        grid-template-columns: 1fr;
      }

      .table-card {
        overflow-x: auto;
      }

      table {
        min-width: 850px;
      }
    }
  `],
  template: `
    <div class="portal">
      <aside class="sidebar">
        <h1 class="logo">KhmerCraft</h1>
        <p class="portal-label">Seller Portal</p>
        <nav class="nav">
          @for (item of navItems; track item.view) {
            <button
              type="button"
              [class.active]="view() === item.view"
              (click)="view.set(item.view)"
            >
              <kc-icon [name]="item.icon" [size]="18" />
              {{ item.label }}
            </button>
          }
        </nav>
        <button type="button" class="logout">
          <kc-icon name="logout" [size]="17" />
          Logout
        </button>
      </aside>

      <section class="content">
        <header class="topbar">
          <div class="search">
            <kc-icon name="search" [size]="18" />
            <input 
              [placeholder]="view() === 'reviews' ? 'Search reviews...' : (view() === 'products' ? 'Search products...' : 'Search orders, ID, or customers...')"
              [ngModel]="globalSearchQuery()" 
              (ngModelChange)="globalSearchQuery.set($event)" 
            />
          </div>
          <div class="top-actions">
            <a class="view-store" href="/">
              View Store
              <kc-icon name="external" [size]="15" />
            </a>
            <kc-icon name="bell" [size]="18" style="color:#146242" />
            <div class="seller-mini">
              <div>
                <strong>{{ storeProfile().storeName || 'Your Store' }}</strong>
                <span>Premium Seller</span>
              </div>
              <div class="avatar" style="background: #146242; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;">
                {{ (storeProfile().storeName || 'Y').substring(0, 1).toUpperCase() }}
              </div>
            </div>
          </div>
        </header>

        @if (view() === 'dashboard') {
          <main class="page">
            <h1>Seller Dashboard</h1>
            <p class="muted">Manage your store, products, orders, and sales.</p>

            <section class="metrics" style="margin-top:28px;grid-template-columns:repeat(5,1fr)">
              @for (metric of dashboardMetrics(); track metric.label) {
                <article class="metric" [class.warn]="metric.warn" [class.gold]="metric.gold">
                  <span class="metric-label" style="text-transform:uppercase">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  <span class="metric-label" style="color:#146242;margin-top:10px">{{ metric.note }}</span>
                </article>
              }
            </section>

            <section class="dashboard-grid">
              <div class="dash-main">
                <article class="table-card">
                  <div class="payout-head">
                    <h2>Recent Orders</h2>
                    <a class="view-all" href="#" style="color:#146242;font-size:12px;font-weight:900;text-decoration:none">View All</a>
                  </div>
                  <table>
                    <thead>
                      <tr><th>Order ID</th><th>Buyer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      @for (order of dashboardOrders(); track order.id) {
                        <tr>
                          <td class="order-id">{{ order.id }}</td>
                          <td>{{ order.buyer }}</td>
                          <td>{{ order.product }}</td>
                          <td>{{ order.qty }}</td>
                          <td><strong>{{ order.total }}</strong></td>
                          <td><span class="status" [class.pending]="order.status === 'PENDING'" [class.shipped]="order.status === 'SHIPPED'" [class.delivered]="order.status === 'DELIVERED'">{{ order.status }}</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </article>

                <div class="quick-actions">
                  <button class="quick-action" type="button" (click)="view.set('add')"><kc-icon name="plus-square" [size]="24" /> Add New<br />Product</button>
                  <button class="quick-action" type="button" (click)="view.set('orders')"><kc-icon name="box" [size]="24" /> View Orders</button>
                  <button class="quick-action" type="button" (click)="view.set('profile')"><kc-icon name="edit" [size]="24" /> Edit Store<br />Profile</button>
                  <button class="quick-action" type="button" (click)="view.set('sales')"><kc-icon name="wallet" [size]="24" /> Sales / Payout</button>
                </div>
              </div>

              <aside>
                <article class="low-stock-card">
                  <h2>Low Stock Alert @if (lowStock().length > 0) { <span class="critical">{{ lowStock().length }} Critical</span> }</h2>
                  @for (stock of lowStock(); track stock.id) {
                    <div class="stock-item">
                      <img [src]="stock.image" [alt]="stock.name" />
                      <div>
                        <strong>{{ stock.name }}</strong>
                        <span>{{ stock.left }} left in stock</span>
                        <button class="small-green" type="button">Update Stock</button>
                      </div>
                    </div>
                  }
                  @if (lowStock().length === 0) {
                    <p class="muted" style="font-size: 13px; margin: 10px 0;">All products have healthy stock levels.</p>
                  }
                  <button class="btn btn-ghost" type="button" style="width:100%;margin-top:10px">View All Inventory</button>
                </article>

                <article class="goal-widget">
                  <h2>Order Fulfillment Goal</h2>
                  <strong>{{ orders().length > 0 ? '100%' : '0%' }}</strong>
                  <div class="progress-line"><span [style.width]="orders().length > 0 ? '100%' : '0%'" style="background:#f2c13d"></span></div>
                  <p class="muted" style="font-size:12px;font-style:italic">{{ orders().length > 0 ? '"You\'re doing great! Keep it up."' : '"No orders yet. Start promoting your products!"' }}</p>
                </article>
              </aside>
            </section>
          </main>
        } @else if (view() === 'products') {
          <main class="page">
            <div class="products-head">
              <div>
                <h1>Products</h1>
                <p class="muted">Add, edit, deactivate, or remove your product listings.</p>
              </div>
              <button class="btn btn-primary" type="button" (click)="view.set('add')"><kc-icon name="plus" [size]="15" /> Add Product</button>
            </div>

            <section class="product-filters">
              <div class="field-control"><kc-icon name="search" [size]="15" /> <input class="dash-input" style="border:none;padding:0;height:auto;flex:1;background:transparent" placeholder="Search by name or SKU" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" /></div>
              <div class="field-control">All Categories</div>
              <div class="field-control">Status: All</div>
              <button class="btn btn-ghost" type="button" style="height:38px;padding:0"><kc-icon name="filter" [size]="16" /></button>
            </section>

            <section class="table-card">
              <table>
                <thead>
                  <tr><th>Image</th><th>Product Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  @for (product of filteredProducts(); track product.id) {
                    <tr>
                      <td><img class="product-thumb" [src]="product.image" [alt]="product.name" /></td>
                      <td class="product-name"><strong>{{ product.name }}</strong><span>{{ product.sku || product.id }}</span></td>
                      <td><span class="pill blue">{{ product.category }}</span></td>
                      <td class="money">{{ product.price }}</td>
                      <td [style.color]="product.stock === 0 ? '#c73030' : '#26302c'">{{ product.stock }}</td>
                      <td><span class="pill" [class.green]="product.status === 'ACTIVE'" [class.yellow]="product.status === 'LOW STOCK'" [class.red]="product.status === 'OUT OF STOCK'">{{ product.status }}</span></td>
                      <td>
                        <div class="row-actions">
                          <button class="icon-btn" type="button" (click)="editProduct(product)"><kc-icon name="edit" [size]="15" /></button>
                          <button class="icon-btn" type="button" (click)="toggleProductStatus(product)"><kc-icon [name]="product.status === 'ACTIVE' ? 'eye-off' : 'eye'" [size]="15" /></button>
                          <button class="icon-btn" type="button" (click)="deleteProduct(product.id)"><kc-icon name="trash" [size]="15" /></button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <div class="table-foot">
                <span>Showing 1 to {{ products().length }} of {{ products().length }} products</span>
              </div>
            </section>

            <section class="product-insights">
              <article class="tip-card">
                <div class="sparkle"><kc-icon name="sparkles" [size]="24" /></div>
                <div>
                  <h2>Product Optimization Tip</h2>
                  @if (lowStock().length > 0) {
                    <p>Your "{{ lowStock()[0].name }}" listing has high traffic but low stock. Restocking soon could prevent you from missing out on potential sales.</p>
                  } @else {
                    <p>Your inventory is looking healthy. Consider adding new products to expand your catalog and reach more buyers.</p>
                  }
                </div>
              </article>
              <article class="inventory-card">
                <h2>Inventory Health <span style="float:right">{{ products().length }}</span></h2>
                <div class="progress-line"><span [style.width]="products().length > 0 ? '100%' : '0%'"></span></div>
                <p>{{ products().length > 0 ? '100%' : '0%' }} of your inventory is currently active and visible to customers.</p>
              </article>
            </section>
          </main>
        } @else if (view() === 'add') {
          <main class="page">
            <h1>Add New Product</h1>
            <p class="muted" style="max-width:690px">Create a new product listing for buyers to discover. Provide detailed information to increase your visibility in the KhmerCraft marketplace.</p>

            <section class="add-layout">
              <div class="add-main">
                <article class="form-card">
                  <h2><kc-icon name="info" [size]="18" style="color:#146242" /> Basic Info</h2>
                  <form class="dash-form">
                    <label>Product Name <span class="required">*</span><input class="dash-input" placeholder="e.g., Handwoven Silk Krama" [ngModel]="newProduct().name" (ngModelChange)="newProduct.set({...newProduct(), name: $event})" name="name" /></label>
                    <div class="two-cols">
                      <label>Category <span class="required">*</span>
                        <select class="dash-input" [ngModel]="newProduct().category" (ngModelChange)="newProduct.set({...newProduct(), category: $event})" name="category">
                          <option value="">Select Category</option>
                          <option value="Handmade Crafts">Handmade Crafts</option>
                          <option value="Pottery">Pottery</option>
                          <option value="Textiles">Textiles</option>
                          <option value="Food & Drink">Food & Drink</option>
                        </select>
                      </label>
                      <label>Material<input class="dash-input" placeholder="e.g., 100% Raw Silk" [ngModel]="newProduct().material" (ngModelChange)="newProduct.set({...newProduct(), material: $event})" name="material" /></label>
                    </div>
                    <label>Description <span class="required">*</span><textarea class="dash-textarea" placeholder="Tell the story of your product..." [ngModel]="newProduct().description" (ngModelChange)="newProduct.set({...newProduct(), description: $event})" name="desc"></textarea></label>
                  </form>
                </article>

                <article class="form-card">
                  <h2><kc-icon name="wallet" [size]="18" style="color:#146242" /> Pricing & Stock</h2>
                  <div class="two-cols" style="grid-template-columns:1fr 1fr 1fr">
                    <label>Price (USD) <span class="required">*</span><input class="dash-input" type="number" placeholder="$ 0.00" [ngModel]="newProduct().price" (ngModelChange)="newProduct.set({...newProduct(), price: $event})" name="price" /></label>
                    <label>Stock Quantity <span class="required">*</span><input class="dash-input" type="number" placeholder="1" [ngModel]="newProduct().stock" (ngModelChange)="newProduct.set({...newProduct(), stock: $event})" name="stock" /></label>
                    <label>Location
                      <select class="dash-input" [ngModel]="newProduct().location" (ngModelChange)="newProduct.set({...newProduct(), location: $event})" name="loc">
                        <option value="Phnom Penh">Phnom Penh</option>
                        <option value="Siem Reap">Siem Reap</option>
                        <option value="Battambang">Battambang</option>
                      </select>
                    </label>
                  </div>
                </article>

                <article class="form-card">
                  <h2><kc-icon name="image" [size]="18" style="color:#146242" /> Product Images</h2>
                  <div class="upload-drop" (click)="fileInput.click()" style="cursor: pointer; position: relative;">
                    <input type="file" #fileInput hidden accept="image/*" (change)="onFileSelected($event)">
                    @if (newProduct().image) {
                      <img [src]="newProduct().image" style="max-height: 120px; object-fit: contain; margin-bottom: 12px; border-radius: 4px;" />
                    }
                    <kc-icon name="upload-cloud" [size]="32" />
                    <span>{{ newProduct().image ? 'Click to change image' : 'Click to upload or drag and drop' }}</span>
                    <small>PNG, JPG or WEBP (Max 5MB each)</small>
                  </div>
                  <button class="add-tile" type="button">+</button>
                </article>

                <article class="publish-card">
                  <div><strong>Publish Immediately</strong><span>Make this product visible to buyers right away.</span></div>
                  <span class="switch"></span>
                </article>
              </div>

              <aside class="add-side">
                <span class="preview-label">Live Preview</span>
                <article class="product-preview">
                  <img [src]="newProduct().image || 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=520&q=85'" alt="Product preview" />
                  <div class="preview-body">
                    <small style="text-transform: uppercase;">{{ newProduct().category || 'Category' }}</small>
                    <h3>{{ newProduct().name || 'Product Name Preview' }}</h3>
                    <p>Store: {{ storeProfile().storeName || 'Your Store' }}</p>
                    <div class="preview-price"><strong>$<span>{{ newProduct().price || '0.00' }}</span> <span style="display:block;color:#6e7974;font-size:11px">Free Delivery</span></strong><span class="pill green">In Stock</span></div>
                  </div>
                </article>
                <article class="pro-tip">
                  <kc-icon name="lightbulb" [size]="22" />
                  <p style="margin:0;font-size:12px;font-weight:800;line-height:1.45">Pro Tip<br /><span style="font-weight:650">Artisans who upload 3+ photos and detailed descriptions see 45% more sales.</span></p>
                </article>
              </aside>
            </section>

            <div class="sticky-save">
              <span class="autosave"><kc-icon name="clock" [size]="14" /> Autosaved 2 minutes ago</span>
              <div class="actions">
                <button class="btn btn-ghost" type="button">Cancel</button>
                <button class="btn btn-ghost" type="button">Save as Draft</button>
                <button class="btn btn-primary" type="button" (click)="submitAddProduct()">Save Product</button>
              </div>
            </div>
          </main>
        } @else if (view() === 'orders') {
          <main class="page">
            <div class="orders-head">
              <div>
                <h1>Orders</h1>
                <p class="muted">View buyer orders and update delivery status.</p>
              </div>
              <div class="actions">
                <button class="btn btn-ghost" type="button"><kc-icon name="download" [size]="15" /> Export List</button>
                <button class="btn btn-primary" type="button"><kc-icon name="plus" [size]="15" /> Manual Order</button>
              </div>
            </div>

            <section class="metrics">
              @for (metric of metrics(); track metric.label) {
                <article class="metric" [class.warn]="metric.warn" [class.gold]="metric.gold">
                  <div class="metric-icon"><kc-icon [name]="metric.icon" [size]="20" /></div>
                  <span class="metric-label">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </article>
              }
            </section>

            <section class="filters">
              <div class="field">
                <label>Search Keywords</label>
                <div class="field-control"><kc-icon name="search" [size]="15" /> <input class="dash-input" style="border:none;padding:0;height:auto;flex:1;background:transparent" placeholder="Order ID or Customer Name" [ngModel]="orderSearchQuery()" (ngModelChange)="orderSearchQuery.set($event)" /></div>
              </div>
              <div class="field">
                <label>Status Filter</label>
                <div class="field-control">All Statuses</div>
              </div>
              <div class="field">
                <label>Date Range</label>
                <div class="field-control">Last 7 Days</div>
              </div>
              <button class="reset" type="button">Reset Filters</button>
            </section>

            <section class="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Buyer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Address</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of filteredOrders(); track order.id) {
                    <tr>
                      <td><span class="order-id" (click)="openOrder(order)">{{ order.id }}</span></td>
                      <td>
                        <div class="buyer">
                          <span class="initial" [style.background]="order.color">{{ order.initials }}</span>
                          {{ order.buyer }}
                        </div>
                      </td>
                      <td>{{ order.product }}</td>
                      <td>{{ order.qty }}</td>
                      <td><strong>{{ order.total }}</strong></td>
                      <td>{{ order.address }}</td>
                      <td>{{ order.date }}</td>
                      <td>
                        <span
                          class="status"
                          [class.pending]="order.statusClass === 'pending'"
                          [class.shipped]="order.statusClass === 'shipped'"
                          [class.delivered]="order.statusClass === 'delivered'"
                        >
                          {{ order.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <div class="table-foot">
                <span>Showing {{ filteredOrders().length === 0 ? '0' : '1' }} to {{ filteredOrders().length }} of {{ filteredOrders().length }} orders</span>
                @if (filteredOrders().length > 0) {
                  <div class="pagination"><span>&lt;</span><span class="current">1</span><span>&gt;</span></div>
                }
              </div>
            </section>
            @if (filteredOrders().length === 0) {
              <div style="text-align:center; padding: 40px; color: #818f89; background: white; border-radius: 8px; margin-top: -16px;">
                <kc-icon name="box" [size]="48" style="opacity: 0.5; margin-bottom: 16px;" />
                <h3>No Orders Found</h3>
                <p>You don't have any orders matching your criteria yet.</p>
              </div>
            }
          </main>
        } @else if (view() === 'reviews') {
          <main class="page reviews-layout">
            <h1 style="color:#146242">Reviews</h1>
            <p class="muted">See buyer ratings and comments for your products.</p>

            <section class="rating-row">
              <article class="rating-card average">
                <span>Average Rating</span>
                <strong>{{ (reviewsStats().averageRating || 0).toFixed(1) }}</strong> <span style="display:inline;color:#6b756f;letter-spacing:0;text-transform:none">/ 5.0</span>
                <div class="stars-large">*****</div>
                <p class="muted" style="font-size:11px;margin-top:7px">Based on {{ reviewsStats().totalReviews || 0 }} total reviews</p>
              </article>

              <article class="rating-card dist">
                <h2>Rating Distribution</h2>
                @for (bar of bars(); track bar.label) {
                  <div class="bar-row">
                    <span>{{ bar.label }}</span>
                    <div class="track"><div class="fill" [class.low]="bar.low" [style.width]="bar.width"></div></div>
                    <span>{{ bar.count }}</span>
                  </div>
                }
              </article>
            </section>

            <div class="review-tabs">
              <div class="chips">
                <button class="chip active" type="button">All ratings</button>
                <button class="chip" type="button">5 stars</button>
                <button class="chip" type="button">4 stars</button>
                <button class="chip" type="button">3 stars</button>
              </div>
              <span class="sort">Newest First</span>
            </div>

            <section class="review-list">
              @for (review of filteredReviews(); track review.id || review.name) {
                <article class="review-card">
                  <div class="review-top">
                    <div class="review-person">
                      <span class="initial" [style.background]="review.color">{{ review.initial }}</span>
                      <div>
                        <h3>{{ review.name }}</h3>
                        <p>Purchased: <span style="color:#146242">{{ review.product }}</span></p>
                      </div>
                    </div>
                    <span class="date">{{ review.date }}</span>
                  </div>
                  <div class="review-stars">*****</div>
                  <p class="review-text">{{ review.text }}</p>
                  @if (review.image) {
                    <img class="review-img" [src]="review.image" alt="Review product" />
                  }
                  @if (review.response) {
                    <div class="response"><strong>Your response:</strong>{{ review.response }}</div>
                  }
                  <div class="review-actions">
                    <a href="#">Reply to buyer</a>
                    <span>Flag as inappropriate</span>
                  </div>
                </article>
              }
            </section>
          </main>
        } @else if (view() === 'profile') {
          <main class="page">
            <h1>Store Profile</h1>
            <p class="muted">Update how your store appears to buyers.</p>

            <section class="profile-grid">
              <div>
                <article class="seller-card">
                  @if (storeProfile().bannerUrl) {
                    <img class="banner" [src]="storeProfile().bannerUrl" alt="Store banner" />
                  } @else {
                    <div class="banner" style="background: #e4ded3; height: 120px; display: flex; align-items: center; justify-content: center; color: #7a8580;">No banner uploaded</div>
                  }
                  <div class="seller-card-body">
                    @if (storeProfile().logoUrl) {
                      <img class="store-logo-preview" [src]="storeProfile().logoUrl" alt="Store logo" />
                    } @else {
                      <div class="store-logo-preview" style="background: #fff; border: 1px solid #e4ded3; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #146242;">
                        {{ (storeProfile().storeName || 'S').substring(0, 1).toUpperCase() }}
                      </div>
                    }
                    <h2>{{ storeProfile().storeName || 'Store Name' }}</h2>
                    <div class="store-rating"><span>{{ storeProfile().location || 'Location' }}</span></div>
                    <p>{{ storeProfile().storeDescription || 'No description provided.' }}</p>
                    <a class="visit" href="/"><kc-icon name="eye" [size]="15" /> View Store</a>
                  </div>
                </article>

                <article class="completion-card">
                  <div class="completion-head"><span>Profile Completion</span><span style="color:#146242">{{ profileCompletion() }}%</span></div>
                  <div class="progress-line"><span [style.width.%]="profileCompletion()"></span></div>
                  <div class="check-list">
                    <span>
                      <kc-icon [name]="storeProfile().storeName && storeProfile().location ? 'check' : 'circle'" [size]="16" [style.color]="storeProfile().storeName && storeProfile().location ? '#146242' : '#ccc'" /> 
                      Basic Info
                    </span>
                    <span>
                      <kc-icon [name]="storeProfile().storeDescription ? 'check' : 'circle'" [size]="16" [style.color]="storeProfile().storeDescription ? '#146242' : '#ccc'" /> 
                      Store Description
                    </span>
                    <span>
                      <kc-icon [name]="storeProfile().phoneNumber ? 'check' : 'circle'" [size]="16" [style.color]="storeProfile().phoneNumber ? '#146242' : '#ccc'" /> 
                      Contact Number
                    </span>
                  </div>
                </article>
              </div>

              <article class="profile-form">
                <div class="upload-row">
                  <div>
                    <label style="font-size:11px;font-weight:900">Store Logo</label>
                    <div class="upload-box" style="height: 140px; cursor: pointer;" (click)="logoInput.click()">
                      <kc-icon name="file" [size]="20" style="color: #146242" />
                      <strong>Replace Logo</strong>
                      <span>SVG, PNG, JPG (Max. 5MB)</span>
                      <input #logoInput type="file" accept="image/*" style="display: none" (change)="onProfileImageSelected($event, 'logoUrl')" />
                    </div>
                  </div>
                  <div>
                    <label style="font-size:11px;font-weight:900">Store Banner</label>
                    <div class="upload-box" style="height: 140px; cursor: pointer;" (click)="bannerInput.click()">
                      <kc-icon name="image" [size]="20" style="color: #146242" />
                      <strong>Upload New Banner</strong>
                      <span>Recommended 1200x400px (Max. 5MB)</span>
                      <input #bannerInput type="file" accept="image/*" style="display: none" (change)="onProfileImageSelected($event, 'bannerUrl')" />
                    </div>
                  </div>
                </div>

                <form class="dash-form">
                  <label>Store Name<input class="dash-input" [ngModel]="storeProfile().storeName" (ngModelChange)="storeProfile.set({...storeProfile(), storeName: $event})" name="storeName" /></label>
                  <label>Description
                    <textarea class="dash-textarea" [ngModel]="storeProfile().storeDescription" (ngModelChange)="storeProfile.set({...storeProfile(), storeDescription: $event})" name="storeDesc"></textarea>
                  </label>
                  <div class="two-cols">
                    <label>Location
                      <div style="position: relative; display: flex;">
                        <input class="dash-input" style="padding-right: 36px; width: 100%" [ngModel]="storeProfile().location" (ngModelChange)="storeProfile.set({...storeProfile(), location: $event})" name="location" placeholder="City, Country" />
                        <button type="button" (click)="detectLocation()" [disabled]="isDetectingLocation()" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #146242; padding: 0; display: flex; align-items: center;" title="Auto-detect Location">
                          <kc-icon [name]="isDetectingLocation() ? 'loader' : 'map-pin'" [size]="18" />
                        </button>
                      </div>
                    </label>
                    <label>Phone Number<input class="dash-input" [ngModel]="storeProfile().phoneNumber" (ngModelChange)="storeProfile.set({...storeProfile(), phoneNumber: $event})" name="phone" /></label>
                  </div>
                  <div class="form-actions">
                    <button class="btn btn-ghost" type="button">Cancel</button>
                    <button class="btn btn-primary" type="button" (click)="saveStoreProfile()">Save Changes</button>
                  </div>
                </form>
              </article>
            </section>
          </main>
        } @else if (view() === 'sales') {
          <main class="page">
            <h1>Sales / Payout</h1>
            <p class="muted">Track your sales, commission, and seller earnings.</p>

            <section class="metrics" style="margin-top:28px">
              @for (metric of payoutMetrics(); track metric.label) {
                <article class="metric" [class.warn]="metric.warn" [class.gold]="metric.gold">
                  <div class="metric-icon"><kc-icon [name]="metric.icon" [size]="20" /></div>
                  <span class="metric-label">{{ metric.note }}</span>
                  <span class="metric-label" style="text-transform:uppercase;margin-top:12px">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </article>
              }
            </section>

            <section class="sales-grid">
              <article class="payout-card sales-main">
                <div class="payout-head">
                  <h2>Payout History</h2>
                  <div class="payout-actions">
                    <button class="btn btn-ghost" type="button"><kc-icon name="filter" [size]="14" /> Filter</button>
                    <button class="btn btn-ghost" type="button"><kc-icon name="download" [size]="14" /> Export</button>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Commission (10%)</th><th>Earning</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    @for (row of payouts(); track row.id) {
                      <tr>
                        <td class="order-id">{{ row.id }}</td>
                        <td>{{ row.date }}</td>
                        <td>{{ row.total }}</td>
                        <td class="commission">{{ row.commission }}</td>
                        <td><strong>{{ row.earning }}</strong></td>
                        <td><span class="status" [class.paid]="row.status === 'PAID'" [class.pending]="row.status === 'PENDING'">{{ row.status }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
                <div class="table-foot">
                  <span>Showing 5 of 124 transactions</span>
                  <div class="pagination"><span>&lt;</span><span>&gt;</span></div>
                </div>
              </article>

              <aside>
                <article class="how-card">
                  <h2>How it works</h2>
                  <p>KhmerCraft empowers artisans with a simple, flat-fee commission structure to keep our community sustainable.</p>
                  <div class="calc-row"><span>Sale Price</span><strong>$100.00</strong></div>
                  <div class="calc-row"><span>Commission <small style="background:#e6ad69;color:#17382a;border-radius:999px;padding:2px 5px">10%</small></span><strong>-$10.00</strong></div>
                  <div class="earning">Your Earning $90.00</div>
                  <div class="info-note"><kc-icon name="info" [size]="15" /> Payouts are processed every Friday for delivered orders that have passed the 7-day return window.</div>
                </article>
                <article class="goal-card">
                  <h3>Next Payout Goal <strong>$1,000 threshold</strong></h3>
                  <div class="progress-line" style="margin:13px 0 9px"><span [style.width]="'0%'"></span></div>
                  <p class="muted" style="font-size:11px">{{ payoutMetrics()[0]?.value || '$0.00' }} reached</p>
                  <button class="btn btn-primary" type="button" style="width:100%;margin-top:16px">Set Automatic Payout</button>
                </article>
              </aside>
            </section>
          </main>
        } @else if (view() === 'settings') {
          <main class="page">
            <h1>Settings</h1>
            <p class="muted">Manage your account and security.</p>

            <section class="settings-grid">
              <div>
                <article class="settings-card">
                  <h2><kc-icon name="user" [size]="18" style="color:#146242" /> Account Info</h2>
                  <form class="settings-form">
                    <div class="two-cols">
                      <label>Full Name<input class="dash-input" [value]="user()?.name" disabled style="background: #f5f7fb; cursor: not-allowed;" /></label>
                      <label>Email Address<input class="dash-input" [value]="user()?.email" disabled style="background: #f5f7fb; cursor: not-allowed;" /></label>
                    </div>
                    <label>Phone Number<input class="dash-input" [ngModel]="storeProfile().phoneNumber" (ngModelChange)="storeProfile.set({...storeProfile(), phoneNumber: $event})" name="settingsPhone" /></label>
                    <div class="form-actions"><button class="btn btn-primary" type="button" (click)="saveStoreProfile()">Save Changes</button></div>
                  </form>
                </article>

                <article class="settings-card" style="margin-top:24px">
                  <h2><kc-icon name="lock" [size]="18" style="color:#146242" /> Security</h2>
                  <form class="settings-form">
                    <label>Current Password<input class="dash-input" type="password" [ngModel]="currentPassword()" (ngModelChange)="currentPassword.set($event)" name="currentPassword" /></label>
                    <div class="two-cols">
                      <label>New Password<input class="dash-input" type="password" [ngModel]="newPassword()" (ngModelChange)="newPassword.set($event)" name="newPassword" /></label>
                      <label>Confirm New Password<input class="dash-input" type="password" [ngModel]="confirmNewPassword()" (ngModelChange)="confirmNewPassword.set($event)" name="confirmNewPassword" /></label>
                    </div>
                    <div><button class="btn btn-ghost" type="button" (click)="updatePassword()">Update Password</button></div>
                  </form>
                </article>
              </div>

              <div>
                <article class="settings-card">
                  <h2><kc-icon name="bell" [size]="18" style="color:#146242" /> Notifications</h2>
                  <div class="toggle-row">
                    <div><strong>Orders</strong><span>Notify when a new order is placed</span></div>
                    <span class="switch"></span>
                  </div>
                  <div class="toggle-row">
                    <div><strong>Low Stock</strong><span>Alert when items are under 5 units</span></div>
                    <span class="switch"></span>
                  </div>
                </article>

                <article class="danger-card" style="margin-top:24px">
                  <h2><kc-icon name="alert" [size]="18" /> Danger Zone</h2>
                  <p>Irreversible actions for your seller account. Please proceed with caution.</p>
                  <div class="danger-action">
                    <div><strong style="color:#26302c">Sign out of all devices</strong><span>Secure your account session</span></div>
                    <button class="danger-link" type="button">Logout</button>
                  </div>
                  <div class="danger-action">
                    <div><strong>Deactivate Account</strong><span>Stop selling and hide your store</span></div>
                    <button class="danger-btn" type="button">Deactivate</button>
                  </div>
                </article>
              </div>
            </section>

            <p class="portal-version">KhmerCraft Seller Portal v2.4.0 · Secured by TLS 1.3</p>
          </main>
        } @else {
          <main class="page">
            <h1>{{ currentTitle() }}</h1>
            <p class="muted">This seller dashboard section is ready for your next workflow.</p>
            <section class="placeholder">
              <h2>{{ currentTitle() }}</h2>
              <p class="muted">Use the sidebar to view the designed Orders and Reviews screens.</p>
            </section>
          </main>
        }
      </section>
    </div>

    @if (selectedOrder(); as order) {
      <div class="backdrop" (click)="closeOrder()">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>
              Order Detail - {{ order.id }}
              <span
                class="status"
                [class.pending]="order.statusClass === 'pending'"
                [class.shipped]="order.statusClass === 'shipped'"
                [class.delivered]="order.statusClass === 'delivered'"
              >{{ order.status }}</span>
            </h2>
            <button type="button" class="close" (click)="closeOrder()">×</button>
          </header>
          <div class="modal-body">
            <div class="detail-grid">
              <article>
                <div class="detail-title"><kc-icon name="user" [size]="14" /> Buyer Info</div>
                <div class="detail-panel">
                  <div class="info-line"><span>Name:</span><span>{{ order.buyer }}</span></div>
                  <div class="info-line"><span>Location:</span><span>{{ order.address }}</span></div>
                  <div class="info-line"><span>Phone:</span><span>{{ order.phone }}</span></div>
                  @if (order.note) {
                    <p class="note">"{{ order.note }}"</p>
                  }
                </div>
              </article>
              <article>
                <div class="detail-title"><kc-icon name="wallet" [size]="14" /> Payment Info</div>
                <div class="detail-panel">
                  <div class="info-line"><span>Method:</span><span>{{ order.paymentMethod }}</span></div>
                  <div class="info-line"><span>Status:</span><span style="color:#146242">{{ order.paymentStatus }}</span></div>
                  <div class="info-line"><span>Total Amount:</span><span style="color:#146242">{{ order.total }}</span></div>
                </div>
              </article>
            </div>

            <div class="detail-title"><kc-icon name="package" [size]="14" /> Product Details</div>
            <section class="product-detail">
              @for (item of order.items; track item.name) {
                <div class="product-line">
                  <img [src]="item.image || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=160&q=85'" [alt]="item.name" />
                  <div>
                    <h3>{{ item.name }}</h3>
                    <p>Qty: {{ item.qty }} * \${{ item.price.toFixed(2) }} ea</p>
                  </div>
                  <div class="subtotal">Subtotal<strong>\${{ item.subtotal.toFixed(2) }}</strong></div>
                </div>
              }
            </section>

            <div class="detail-title">Update Order Status</div>
            @if (statusUpdateError()) {
              <p class="note" style="color:#b3261e">{{ statusUpdateError() }}</p>
            }
            <div class="modal-actions">
              @if (nextStatusOptions(order.status).length) {
                <select
                  [ngModel]="statusChoice()"
                  (ngModelChange)="statusChoice.set($event)"
                  [disabled]="updatingStatus()"
                >
                  @for (opt of nextStatusOptions(order.status); track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
                <button class="btn btn-ghost" type="button" (click)="closeOrder()">Close</button>
                <button
                  class="btn btn-primary"
                  type="button"
                  [disabled]="updatingStatus() || !statusChoice()"
                  (click)="submitStatusUpdate()"
                >{{ updatingStatus() ? 'Updating…' : 'Update Status' }}</button>
              } @else {
                <span class="muted">This order is in a final state and cannot be updated.</span>
                <button class="btn btn-ghost" type="button" (click)="closeOrder()">Close</button>
              }
            </div>
          </div>
        </section>
      </div>
    }
  `,
})
export class SellerDashboardPage implements OnInit {
  private readonly sellerService = inject(SellerService);
  private readonly commerceApi = inject(CommerceApiService);
  protected readonly authService = inject(AuthService);
  protected readonly user = this.authService.user;

  protected readonly view = signal<DashboardView>('dashboard');
  protected readonly selectedOrder = signal<SellerOrder | null>(null);
  protected readonly statusChoice = signal<OrderStatus | ''>('');
  protected readonly updatingStatus = signal(false);
  protected readonly statusUpdateError = signal('');
  protected readonly myStoreId = signal<string | null>(null);

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmNewPassword = signal('');

  protected readonly isDetectingLocation = signal(false);

  updatePassword() {
    if (!this.currentPassword() || !this.newPassword() || !this.confirmNewPassword()) {
      alert('Please fill in all password fields.');
      return;
    }
    if (this.newPassword() !== this.confirmNewPassword()) {
      alert('New passwords do not match.');
      return;
    }

    this.authService.changePassword(
      this.currentPassword(),
      this.newPassword(),
      this.confirmNewPassword()
    ).subscribe({
      next: () => {
        alert('Password updated successfully');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmNewPassword.set('');
      },
      error: (err) => {
        alert('Failed to update password: ' + (err.error?.message || err.message));
      }
    });
  }

  async detectLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    this.isDetectingLocation.set(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          const country = data.address?.country || '';
          const locationString = [city, country].filter(Boolean).join(', ');
          
          this.storeProfile.set({ ...this.storeProfile(), location: locationString || `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        } catch (err) {
          alert('Failed to get location name. Using coordinates instead.');
          this.storeProfile.set({ ...this.storeProfile(), location: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        } finally {
          this.isDetectingLocation.set(false);
        }
      },
      (error) => {
        alert('Unable to retrieve your location. Please check your browser permissions.');
        this.isDetectingLocation.set(false);
      }
    );
  }

  protected readonly profileCompletion = computed(() => {
    const p = this.storeProfile();
    let score = 0;
    if (p.storeName?.trim()) score += 25;
    if (p.storeDescription?.trim()) score += 25;
    if (p.location?.trim()) score += 25;
    if (p.phoneNumber?.trim()) score += 25;
    return score;
  });
  
  private readonly http = inject(HttpClient);
  
  ngOnInit() {
    this.http.get<any[]>(`${API_URL}/sellers/my-stores`).subscribe({
      next: (stores) => {
        if (stores && stores.length > 0) {
          const storeId = stores[0]._id;
          this.myStoreId.set(storeId);
          this.loadDashboardData(storeId);
        } else {
          alert('API returned empty stores list! Backend failed to create it.');
        }
      },
      error: (err) => {
        console.error('Failed to load stores', err);
        alert('API error when loading stores: ' + err.status + ' ' + (err.error?.message || err.message));
      }
    });
  }

  private loadDashboardData(storeId: string) {
    // 1. Orders and Metrics
    this.sellerService.getStoreOrders(storeId).subscribe({
      next: (data) => {
        this.metrics.set([
          { label: 'Pending Orders', value: data.metrics.pendingOrders.toString(), icon: 'clipboard' },
          { label: 'In Transit', value: data.metrics.inTransit.toString(), icon: 'truck', warn: true },
          { label: 'Completed (30d)', value: data.metrics.completed30d.toString(), icon: 'check' },
          { label: 'Revenue (MTD)', value: `$${data.metrics.revenueMtd.toFixed(2)}`, icon: 'wallet', gold: true },
        ]);

        this.dashboardMetrics.set([
          { label: 'Total Sales', value: `$${data.metrics.revenueMtd.toFixed(2)}`, note: 'Lifetime', icon: 'chart' },
          { label: 'Pending Orders', value: data.metrics.pendingOrders.toString(), note: 'Requires Action', icon: 'clipboard', warn: true },
        ]);

        this.payoutMetrics.set([
          { label: 'Total Sales', value: `$${data.metrics.revenueMtd.toFixed(2)}`, note: 'This month', icon: 'chart' },
          { label: 'Platform Commission', value: `$${(data.metrics.revenueMtd * 0.1).toFixed(2)}`, note: '10% standard rate', icon: 'percent', warn: true },
          { label: 'Seller Earnings', value: `$${(data.metrics.revenueMtd * 0.9).toFixed(2)}`, note: 'Ready for payout', icon: 'wallet' },
        ]);

        const mappedOrders = data.orders.map((o: any) => {
          let statusClass: OrderStatusClass = 'pending';
          if (o.orderStatus === 'SHIPPED') statusClass = 'shipped';
          if (o.orderStatus === 'DELIVERED') statusClass = 'delivered';
          return {
            id: o.orderNumber || o.id,
            buyer: o.buyerName,
            initials: o.buyerName ? o.buyerName.substring(0, 2).toUpperCase() : 'CU',
            color: '#dfe8ff',
            product: o.myItems.length > 0 ? o.myItems[0].productName : 'Multiple Items',
            qty: o.myItems.length > 0 ? o.myItems[0].quantity : 1,
            total: `$${o.myTotal.toFixed(2)}`,
            address: o.deliveryInfo?.address || 'No address',
            date: new Date(o.createdAt).toLocaleDateString(),
            status: o.orderStatus,
            statusClass,
            phone: o.buyerPhone || o.deliveryInfo?.phone || '',
            note: o.deliveryInfo?.note || '',
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            items: o.myItems.map((item: any) => ({
              name: item.productName,
              image: item.productImage ?? null,
              qty: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
          };
        });
        this.orders.set(mappedOrders);
        this.dashboardOrders.set(mappedOrders.slice(0, 5));

        // Populate payouts logic (mock payout using completed orders)
        const payoutData = data.orders
          .filter((o: any) => o.paymentStatus === 'PAID')
          .map((o: any) => {
            const total = o.myTotal;
            const commission = total * 0.1;
            const earning = total - commission;
            return {
              id: o.orderNumber || o.id,
              date: new Date(o.createdAt).toLocaleDateString(),
              total: `$${total.toFixed(2)}`,
              commission: `$${commission.toFixed(2)}`,
              earning: `$${earning.toFixed(2)}`,
              status: 'PAID'
            };
          });
        this.payouts.set(payoutData);
      },
      error: (err) => console.error('Failed to load orders', err)
    });

    // 2. Products
    this.sellerService.getStoreProducts(storeId).subscribe({
      next: (data) => {
        this.products.set(data.products || []);
        this.lowStock.set((data.products || []).filter((p: any) => p.stock <= 5));
      },
      error: (err) => console.error('Failed to load products', err)
    });

    // 3. Profile
    this.sellerService.getStoreProfile(storeId).subscribe({
      next: (profile) => {
        this.storeProfile.set({
          storeName: profile.storeName,
          storeDescription: profile.storeDescription,
          location: profile.location,
          phoneNumber: profile.phoneNumber,
          logoUrl: profile.logoUrl,
          bannerUrl: profile.bannerUrl
        });
      },
      error: (err) => console.error('Failed to load profile', err)
    });

    // 4. Reviews
    this.sellerService.getStoreReviews(storeId).subscribe({
      next: (data) => {
        this.reviewsStats.set(data.stats || {});
        const mappedReviews = (data.reviews || []).map((r: any) => ({
          id: r._id,
          name: r.reviewerName || 'Anonymous',
          initial: (r.reviewerName || 'A').substring(0, 1).toUpperCase(),
          color: '#f0a36e',
          product: r.productName || 'Unknown Product',
          date: new Date(r.createdAt).toLocaleDateString(),
          text: r.comment,
          rating: r.rating,
          response: r.sellerResponse || null
        }));
        this.reviews.set(mappedReviews);
      },
      error: (err) => console.error('Failed to load reviews', err)
    });
  }

  protected readonly navItems: Array<{ view: DashboardView; label: string; icon: string }> = [
    { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { view: 'products', label: 'Products', icon: 'box' },
    { view: 'add', label: 'Add Product', icon: 'plus-square' },
    { view: 'orders', label: 'Orders', icon: 'cart' },
    { view: 'profile', label: 'Store Profile', icon: 'store' },
    { view: 'sales', label: 'Sales / Payout', icon: 'wallet' },
    { view: 'reviews', label: 'Reviews', icon: 'review' },
    { view: 'settings', label: 'Settings', icon: 'settings' },
  ];

  protected readonly metrics = signal<DashboardMetric[]>([
    { label: 'Pending Orders', value: '-', icon: 'clipboard' },
    { label: 'In Transit', value: '-', icon: 'truck', warn: true },
    { label: 'Completed (30d)', value: '-', icon: 'check' },
    { label: 'Revenue (MTD)', value: '-', icon: 'wallet', gold: true },
  ]);

  protected readonly dashboardMetrics = signal<DashboardMetric[]>([]);
  protected readonly dashboardOrders = signal<any[]>([]);
  protected readonly lowStock = signal<any[]>([]);
  protected readonly products = signal<any[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly globalSearchQuery = signal('');
  
  protected readonly filteredProducts = computed(() => {
    const localQ = this.searchQuery().toLowerCase();
    const globalQ = this.globalSearchQuery().toLowerCase();
    const q = localQ || globalQ;
    if (!q) return this.products();
    return this.products().filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)));
  });
  protected readonly payoutMetrics = signal<DashboardMetric[]>([]);
  
  // Also create a signal for store profile
  protected readonly storeProfile = signal<any>({
    storeName: '',
    storeDescription: '',
    location: '',
    phoneNumber: '',
  });

  protected readonly newProduct = signal<any>({
    name: '', category: '', material: '', description: '', price: null, stock: null, location: 'Phnom Penh', status: 'ACTIVE', image: ''
  });

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newProduct.set({ ...this.newProduct(), image: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  protected readonly reviews = signal<any[]>([]);
  protected readonly filteredReviews = computed(() => {
    const q = this.globalSearchQuery().toLowerCase();
    if (!q) return this.reviews();
    return this.reviews().filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.comment.toLowerCase().includes(q) ||
      (r.product && r.product.toLowerCase().includes(q))
    );
  });
  protected readonly reviewsStats = signal<any>({});
  protected readonly payouts = signal<any[]>([]);

  editProduct(product: any) {
    this.newProduct.set({ ...product });
    this.view.set('add'); // Reusing the add view for editing
  }

  toggleProductStatus(product: any) {
    const newStatus = product.status === 'ACTIVE' ? 'OUT OF STOCK' : 'ACTIVE';
    this.sellerService.updateProduct(product.id, { status: newStatus }).subscribe({
      next: () => {
        if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
      },
      error: (err) => alert('Failed to update status: ' + err.message)
    });
  }

  deleteProduct(productId: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.sellerService.deleteProduct(productId).subscribe({
        next: () => {
          if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
        },
        error: (err) => alert('Failed to delete product: ' + err.message)
      });
    }
  }

  submitAddProduct() {
    const data = { ...this.newProduct() };
    
    // Parse numbers safely from input binding strings
    data.price = Number(data.price);
    data.stock = Number(data.stock);

    if (!data.name || !data.category || !data.price || isNaN(data.stock)) return;

    data.sellerName = this.user()?.name || 'Sothy Roth';
    data.storeName = this.storeProfile()?.storeName || 'Sothy Awesome Store';
    data.sellerId = this.myStoreId() || undefined;

    // Clean up fields that backend strict validation rejects
    delete data.material;
    if (!data.image) {
      delete data.image;
    }
    
    // If it has an id, it is an edit
    if (data.id) {
      const id = data.id;
      delete data.id;
      this.sellerService.updateProduct(id, data).subscribe({
        next: () => {
          alert('Product updated successfully!');
          if (this.myStoreId()) this.loadDashboardData(this.myStoreId()!);
          this.view.set('products');
          this.newProduct.set({ name: '', category: '', material: '', description: '', price: null, stock: null, location: 'Phnom Penh', status: 'ACTIVE', image: '' });
        },
        error: (err) => {
          const errorMsg = err.error?.error?.details || err.error?.error?.message || err.message;
          alert('Failed to update product: ' + JSON.stringify(errorMsg));
        }
      });
      return;
    }

    this.sellerService.createProduct(data).subscribe({
      next: () => {
        alert('Product added successfully!');
        if (this.myStoreId()) {
          this.loadDashboardData(this.myStoreId()!);
        }
        this.view.set('products');
        this.newProduct.set({ name: '', category: '', material: '', description: '', price: null, stock: null, location: 'Phnom Penh', status: 'ACTIVE', image: '' });
      },
      error: (err) => {
        const errorMsg = err.error?.error?.details || err.error?.error?.message || err.message;
        alert('Failed to add product: ' + JSON.stringify(errorMsg));
      }
    });
  }

  saveStoreProfile() {
    const data = this.storeProfile();
    const id = this.myStoreId();
    if (!id) {
      alert('Store ID is missing! Please refresh the page and try again.');
      return;
    }
    this.sellerService.updateStoreProfile(id, data).subscribe({
      next: () => alert('Store profile updated successfully!'),
      error: (err) => alert('Failed to update profile: ' + (err.error?.message || err.message))
    });
  }



  protected readonly orders = signal<SellerOrder[]>([]);
  protected readonly orderSearchQuery = signal('');
  protected readonly filteredOrders = computed(() => {
    const localQ = this.orderSearchQuery().toLowerCase();
    const globalQ = this.globalSearchQuery().toLowerCase();
    const q = localQ || globalQ;
    if (!q) return this.orders();
    return this.orders().filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.buyer.toLowerCase().includes(q) ||
      o.product.toLowerCase().includes(q)
    );
  });

  protected readonly bars = signal<any[]>([]);





  protected currentTitle(): string {
    return this.navItems.find((item) => item.view === this.view())?.label ?? 'Dashboard';
  }

  /** Mirrors the server's order-lifecycle rules so the dropdown never offers an illegal move. */
  protected nextStatusOptions(status: string): OrderStatus[] {
    switch (status) {
      case 'PENDING':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['SHIPPED', 'CANCELLED'];
      case 'SHIPPED':
        return ['DELIVERED'];
      default:
        return [];
    }
  }

  protected openOrder(order: SellerOrder): void {
    this.statusUpdateError.set('');
    const options = this.nextStatusOptions(order.status);
    this.statusChoice.set(options[0] ?? '');
    this.selectedOrder.set(order);
  }

  protected closeOrder(): void {
    this.selectedOrder.set(null);
    this.statusUpdateError.set('');
  }

  protected async submitStatusUpdate(): Promise<void> {
    const order = this.selectedOrder();
    const next = this.statusChoice();
    if (!order || !next) {
      return;
    }

    this.updatingStatus.set(true);
    this.statusUpdateError.set('');
    try {
      await firstValueFrom(this.commerceApi.setOrderStatus(order.id, next));

      const patch = (candidate: SellerOrder): SellerOrder =>
        candidate.id === order.id
          ? {
              ...candidate,
              status: next,
              statusClass:
                next === 'SHIPPED' ? 'shipped' : next === 'DELIVERED' ? 'delivered' : 'pending',
            }
          : candidate;
      this.orders.update((orders) => orders.map(patch));
      this.dashboardOrders.update((orders) => orders.map(patch));

      this.closeOrder();
    } catch (error: unknown) {
      this.statusUpdateError.set(cartErrorMessage(error));
    } finally {
      this.updatingStatus.set(false);
    }
  }

  onProfileImageSelected(event: any, field: 'logoUrl' | 'bannerUrl') {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large (max 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Str = e.target?.result as string;
        this.storeProfile.set({ ...this.storeProfile(), [field]: base64Str });
      };
      reader.readAsDataURL(file);
    }
  }
}
