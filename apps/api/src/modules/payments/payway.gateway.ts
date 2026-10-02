import crypto from 'node:crypto';
import { AppError } from '../../errors/app-error';
import { env } from '../../config/env';

/**
 * The ABA PayWay client — everything that actually speaks to ABA, and nothing
 * that knows what is being paid for.
 *
 * Orders and seller subscriptions both pay through here, so the signing rules
 * exist once. Anything domain-shaped (which order, which store, what happens
 * when it settles) belongs in the calling module, not in this file.
 *
 * Verified against the live sandbox with this project's merchant account:
 *   - The account is provisioned for KHQR, so a purchase request answers with
 *     JSON ({qrString, qrImage, abapay_deeplink, ...}) rather than a hosted
 *     checkout page — there is nothing to redirect a browser to.
 *   - It accepts USD only; `currency=KHR` is rejected with code 12.
 */

/** The only currency this merchant accepts. */
export const PAYWAY_CURRENCY = 'USD';

/** How long a generated QR stays payable, in minutes. */
export const QR_LIFETIME_MINUTES = 30;

const requireCredentials = () => {
  if (!env.paywayMerchantId || !env.paywayApiKey) {
    throw new AppError(
      500,
      'ABA PayWay is not configured on this server yet',
      'PAYWAY_NOT_CONFIGURED',
    );
  }
  return { merchantId: env.paywayMerchantId, apiKey: env.paywayApiKey };
};

/** YYYYMMDDHHmmss in UTC, the timestamp format PayWay's API expects. */
const paywayTimestamp = (date = new Date()): string =>
  date.toISOString().replace(/[-:T]/g, '').slice(0, 14);

const base64 = (value: string) => Buffer.from(value, 'utf8').toString('base64');

const hmacSha512Base64 = (payload: string, key: string): string =>
  crypto.createHmac('sha512', key).update(payload).digest('base64');

/**
 * The exact field order PayWay concatenates before hashing. Unused fields are
 * sent as empty strings and still take their place here — which is free,
 * since concatenating an empty string changes nothing, but keeping them
 * listed means adding a value later cannot silently land in the wrong slot.
 *
 * `ctid`/`pwt` (card-on-file) and `view_type`/`payment_gate` are deliberately
 * absent: ABA excludes the latter two from the hash, and the former two are
 * only sent by merchants using saved cards.
 */
const HASH_FIELD_ORDER = [
  'req_time',
  'merchant_id',
  'tran_id',
  'amount',
  'items',
  'shipping',
  'firstname',
  'lastname',
  'email',
  'phone',
  'type',
  'payment_option',
  'return_url',
  'cancel_url',
  'continue_success_url',
  'return_deeplink',
  'currency',
  'custom_fields',
  'return_params',
  'payout',
  'lifetime',
  'additional_params',
  'google_pay_token',
  'skip_success_page',
] as const;

type PurchaseFields = Record<(typeof HASH_FIELD_ORDER)[number], string>;

const buildPurchaseHash = (fields: PurchaseFields, apiKey: string): string =>
  hmacSha512Base64(
    HASH_FIELD_ORDER.map((field) => fields[field]).join(''),
    apiKey,
  );

/**
 * tran_id is capped at 20 characters by PayWay — generated fresh per attempt
 * so a retried payment gets a new id, and matched back to whatever is being
 * paid for by storing it on that record.
 */
export const generateTranId = (): string =>
  `KC${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`
    .toUpperCase()
    .slice(0, 20);

/**
 * PayWay wraps every reply in a `status` object whose `code` is "00" on
 * success — and which arrives as a string there but as a *number* on failure
 * (12 for a rejected currency, for instance), hence the String() before
 * comparing.
 */
const readStatusCode = (body: unknown): { code: string; message: string } => {
  const status =
    body && typeof body === 'object'
      ? ((body as Record<string, unknown>)['status'] as
          | Record<string, unknown>
          | undefined)
      : undefined;
  return {
    code: String(status?.['code'] ?? ''),
    message: String(status?.['message'] ?? 'Unknown PayWay response'),
  };
};

const readString = (body: unknown, key: string): string | undefined => {
  const value =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>)[key]
      : undefined;
  return typeof value === 'string' && value ? value : undefined;
};

export interface PaywayLineItem {
  name: string;
  quantity: number;
  price: number;
}

export interface CreateTransactionInput {
  tranId: string;
  /** Charged amount; formatted to 2dp for ABA. */
  amount: number;
  items: PaywayLineItem[];
  firstName: string;
  phone: string;
  /** Echoed back by ABA on its webhook — the order or payment reference. */
  returnParams: string;
  /** Where the ABA app sends the buyer once they have paid. */
  successUrl: string;
  cancelUrl: string;
  /** Shipping component of the amount, when there is one. */
  shipping?: number;
}

export interface PaywayTransaction {
  tranId: string;
  amount: number;
  currency: string;
  /** `data:image/png;base64,…`, ready for an <img src>. */
  qrImage: string;
  /** The raw EMVCo payload behind the QR, for copy-to-clipboard. */
  qrString: string;
  /** `abamobilebank://…` — opens the ABA app on this payment. */
  deeplink?: string;
  appStore?: string;
  playStore?: string;
  expiresAt: string;
}

/** Opens a transaction at ABA and returns the KHQR that pays it. */
export const createTransaction = async (
  input: CreateTransactionInput,
): Promise<PaywayTransaction> => {
  const { merchantId, apiKey } = requireCredentials();

  const fields: PurchaseFields = {
    req_time: paywayTimestamp(),
    merchant_id: merchantId,
    tran_id: input.tranId,
    amount: input.amount.toFixed(2),
    items: base64(JSON.stringify(input.items)),
    shipping: input.shipping === undefined ? '' : input.shipping.toFixed(2),
    firstname: input.firstName,
    lastname: '',
    email: '',
    phone: input.phone,
    type: 'purchase',
    // Returns the QR *and* an ABA app deeplink, so one response serves a
    // desktop payer (scan) and a phone payer (tap through to the app).
    payment_option: 'abapay_khqr_deeplink',
    return_url: base64(env.paywayCallbackUrl), // server-to-server webhook
    cancel_url: base64(input.cancelUrl),
    continue_success_url: base64(input.successUrl),
    return_deeplink: base64(JSON.stringify({ web_url: input.successUrl })),
    currency: PAYWAY_CURRENCY,
    custom_fields: '',
    return_params: input.returnParams,
    payout: '',
    lifetime: String(QR_LIFETIME_MINUTES),
    additional_params: '',
    google_pay_token: '',
    skip_success_page: '',
  };

  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    // PayWay reads absent and empty as the same thing; sending only what has
    // a value keeps the request readable in a packet capture.
    if (value !== '') {
      form.append(name, value);
    }
  }
  form.append('hash', buildPurchaseHash(fields, apiKey));

  const response = await fetch(
    `${env.paywayBaseUrl}/api/payment-gateway/v1/payments/purchase`,
    { method: 'POST', body: form },
  );

  const body: unknown = await response.json().catch(() => null);
  const { code, message } = readStatusCode(body);

  if (code !== '00') {
    // ABA's own wording is the useful part here ("Payment currency is not
    // allowed", "Invalid hash", "Transaction ID already exists"), so it is
    // logged in full and summarised to the caller.
    console.error('[payway] purchase rejected:', JSON.stringify(body));
    throw new AppError(
      502,
      `ABA PayWay could not start this payment: ${message}`,
      'PAYWAY_REQUEST_FAILED',
    );
  }

  const qrImage = readString(body, 'qrImage');
  const qrString = readString(body, 'qrString');
  if (!qrImage || !qrString) {
    console.error('[payway] purchase missing QR:', JSON.stringify(body));
    throw new AppError(
      502,
      'ABA PayWay did not return a payment QR',
      'PAYWAY_REQUEST_FAILED',
    );
  }

  return {
    tranId: input.tranId,
    amount: input.amount,
    currency: PAYWAY_CURRENCY,
    qrImage,
    qrString,
    deeplink: readString(body, 'abapay_deeplink'),
    appStore: readString(body, 'app_store'),
    playStore: readString(body, 'play_store'),
    expiresAt: new Date(
      Date.now() + QR_LIFETIME_MINUTES * 60_000,
    ).toISOString(),
  };
};

/**
 * The payment outcome lives under `data`, not in the top-level `status`
 * object — that one only reports whether the *lookup* succeeded. Confirmed
 * against a real sandbox transaction, which answered
 * `{"data":{"payment_status_code":2,"payment_status":"PENDING",…},
 *   "status":{"code":"00","message":"Success!"}}`.
 */
const PAYMENT_STATUS_CODES = {
  APPROVED: 0,
  PENDING: 2,
  DECLINED: 3,
  REFUNDED: 4,
  CANCELLED: 7,
} as const;

/** `status.code` from check-transaction-2 when the tran_id is unknown to it. */
const LOOKUP_TRAN_ID_NOT_FOUND = 6;

export type PaywayStatus = 'PAID' | 'FAILED' | 'PENDING' | 'REFUNDED';

/**
 * Asks ABA what really happened to a transaction. This is the only thing any
 * caller should ever trust — never a webhook payload's claimed status, and
 * never the browser coming back from the ABA app.
 */
export const checkTransaction = async (
  tranId: string,
): Promise<PaywayStatus> => {
  const { merchantId, apiKey } = requireCredentials();
  const reqTime = paywayTimestamp();
  const hash = hmacSha512Base64(reqTime + merchantId + tranId, apiKey);

  const response = await fetch(
    `${env.paywayBaseUrl}/api/payment-gateway/v1/payments/check-transaction-2`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        req_time: reqTime,
        merchant_id: merchantId,
        tran_id: tranId,
        hash,
      }),
    },
  );

  const body: unknown = await response.json().catch(() => null);

  // Expected, not an anomaly: for a second or two after a transaction is
  // created PayWay does not yet know the tran_id, and a payment page's first
  // poll lands inside that window. Confirmed against the sandbox — the same
  // lookup succeeds ~1.5s later.
  if (readStatusCode(body).code === String(LOOKUP_TRAN_ID_NOT_FOUND)) {
    return 'PENDING';
  }

  const data =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>)['data']
      : undefined;
  const code =
    data && typeof data === 'object'
      ? (data as Record<string, unknown>)['payment_status_code']
      : undefined;

  switch (code) {
    case PAYMENT_STATUS_CODES.APPROVED:
      return 'PAID';
    case PAYMENT_STATUS_CODES.DECLINED:
    case PAYMENT_STATUS_CODES.CANCELLED:
      return 'FAILED';
    case PAYMENT_STATUS_CODES.REFUNDED:
      return 'REFUNDED';
    case PAYMENT_STATUS_CODES.PENDING:
      return 'PENDING';
    default:
      // An unreadable reply must not be mistaken for "not paid yet and fine" —
      // log it so a shifted response shape is visible, then hold at PENDING.
      console.warn(
        '[payway] unrecognised check-transaction response:',
        JSON.stringify(body),
      );
      return 'PENDING';
  }
};
