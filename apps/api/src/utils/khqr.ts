import QRCode from 'qrcode';

/**
 * Bakong KHQR, built locally.
 *
 * KHQR is the National Bank of Cambodia's EMVCo QR standard. A dynamic
 * "individual" KHQR carries a Bakong account id (e.g. `sokdara@aba`), the
 * amount and currency, so the customer's banking app — ABA, ACLEDA, Wing or
 * any Bakong member — opens with the amount already filled in and the money
 * lands directly in that account. No gateway is involved, which is why the
 * POS can confirm payment only by the cashier checking their own app.
 *
 * Layout: tag(2) + length(2) + value, repeated, ending in a CRC16 checksum.
 */

const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, '0')}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as EMVCo requires. */
export const crc16 = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

/** EMVCo fields are ASCII; strip accents/Khmer script and clamp to the field size. */
const ascii = (value: string, max: number) =>
  value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, max) || 'KhmerCraft Seller';

export const BAKONG_ACCOUNT_PATTERN = /^[a-z0-9._-]{1,32}@[a-z0-9]{2,12}$/i;

export interface KhqrInput {
  bakongAccountId: string;
  merchantName: string;
  merchantCity?: string;
  amount: number;
  currency: 'USD' | 'KHR';
  /** Shown in the payer's banking app as the bill number. */
  billNumber?: string;
  storeLabel?: string;
}

export const buildKhqrString = (input: KhqrInput, now = new Date()) => {
  if (!BAKONG_ACCOUNT_PATTERN.test(input.bakongAccountId)) {
    throw new Error('Invalid Bakong account id');
  }
  // USD carries cents; riel is whole numbers only.
  const amount =
    input.currency === 'KHR'
      ? String(Math.round(input.amount))
      : String(Number(input.amount.toFixed(2)));

  const additional =
    (input.billNumber ? tlv('01', ascii(input.billNumber, 25)) : '') +
    (input.storeLabel ? tlv('03', ascii(input.storeLabel, 25)) : '');

  const body =
    tlv('00', '01') + // payload format
    tlv('01', '12') + // dynamic: this QR is for one amount
    tlv('29', tlv('00', input.bakongAccountId)) + // individual Bakong account
    tlv('52', '5999') + // merchant category: general retail
    tlv('53', input.currency === 'KHR' ? '116' : '840') +
    tlv('54', amount) +
    tlv('58', 'KH') +
    tlv('59', ascii(input.merchantName, 25)) +
    tlv('60', ascii(input.merchantCity || 'Phnom Penh', 15)) +
    (additional ? tlv('62', additional) : '') +
    tlv('99', tlv('00', String(now.getTime()))) + // creation timestamp
    '6304';

  return body + crc16(body);
};

export const khqrImage = (payload: string) =>
  QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 360 });
