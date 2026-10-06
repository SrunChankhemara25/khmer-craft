import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { KcIcon } from '../ui/kc-icon/kc-icon';
import { copyText, facebookShareUrl, telegramShareUrl, whatsappShareUrl } from '../../../core/share/share-links';

export interface ShareItem {
  id: string;
  /** Row label when several links are offered ("Cups & Mugs"). */
  label: string;
  /** Small grey text beside the label ("3 products"). */
  hint?: string;
  /** What the preview card shows — mirrors what the share page tells Telegram & co. */
  title: string;
  description: string;
  imageUrl?: string | null;
  url: string;
}

/**
 * "Share" window for sellers: shows how the link will look when pasted into a
 * chat, with Copy and one-tap Telegram / WhatsApp / Facebook buttons. With
 * several items (a store and its categories) each row has its own Copy button.
 */
@Component({
  selector: 'kc-share-dialog',
  standalone: true,
  imports: [KcIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="heading()" (click)="$event.stopPropagation()">
        <header>
          <h2>{{ heading() }}</h2>
          <button class="x" type="button" (click)="closed.emit()" aria-label="Close">✕</button>
        </header>
        @if (intro()) { <p class="intro">{{ intro() }}</p> }

        @if (selected(); as item) {
          <p class="eyebrow">How it looks when shared</p>
          <div class="preview">
            @if (item.imageUrl) {
              <img [src]="item.imageUrl" [alt]="item.title" (error)="imageFailed.set(true)" [hidden]="imageFailed()" />
            }
            @if (!item.imageUrl || imageFailed()) { <div class="no-photo">No photo yet</div> }
            <div class="meta">
              <span class="site">KhmerCraft</span>
              <strong>{{ item.title }}</strong>
              <span class="desc">{{ item.description }}</span>
            </div>
          </div>

          <label class="field">
            <span>Link</span>
            <span class="row">
              <input type="text" readonly [value]="item.url" (focus)="$any($event.target).select()" />
              <button class="copy" type="button" (click)="copy(item)">
                <kc-icon [name]="copiedId() === item.id ? 'check' : 'copy'" [size]="15" />
                {{ copiedId() === item.id ? 'Copied' : 'Copy link' }}
              </button>
            </span>
          </label>
          <p class="sr-only" aria-live="polite">{{ copiedId() ? 'Link copied to clipboard' : '' }}</p>

          <div class="channels">
            <span>Send it on</span>
            <a [href]="telegram(item)" target="_blank" rel="noopener noreferrer">Telegram</a>
            <a [href]="whatsapp(item)" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a [href]="facebook(item)" target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
        }

        @if (items().length > 1) {
          <ul class="list" aria-label="Choose a link">
            @for (entry of items(); track entry.id) {
              <li [class.on]="entry.id === selectedId()">
                <button type="button" class="pick" (click)="select(entry.id)">
                  <strong>{{ entry.label }}</strong>
                  @if (entry.hint) { <span>{{ entry.hint }}</span> }
                </button>
                <button type="button" class="mini" (click)="copy(entry)" [attr.aria-label]="'Copy link for ' + entry.label">
                  {{ copiedId() === entry.id ? 'Copied' : 'Copy' }}
                </button>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .backdrop { position: fixed; inset: 0; z-index: 400; background: rgba(28, 22, 16, .55); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .dialog { width: min(520px, 100%); max-height: 92vh; overflow-y: auto; background: #fff; color: #241f19; border-radius: 16px; padding: 20px; box-shadow: 0 24px 70px rgba(28, 22, 16, .3); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h2 { margin: 0; font-size: 18px; }
    .x { border: 0; background: #f3eee6; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 14px; }
    .intro { margin: 6px 0 0; font-size: 13px; color: #6b6258; }
    .eyebrow { margin: 16px 0 6px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #8a8076; font-weight: 700; }
    .preview { border: 1px solid #e4dccf; border-radius: 12px; overflow: hidden; background: #faf7f2; }
    .preview img { display: block; width: 100%; max-height: 220px; object-fit: cover; background: #efe8dc; }
    .no-photo { height: 120px; display: grid; place-items: center; background: #efe8dc; color: #8a8076; font-size: 13px; }
    .meta { display: grid; gap: 3px; padding: 11px 13px 13px; border-left: 3px solid #8c2f1f; }
    .site { font-size: 11px; color: #8a8076; text-transform: uppercase; letter-spacing: .05em; }
    .meta strong { font-size: 15px; line-height: 1.3; }
    .desc { font-size: 13px; color: #6b6258; line-height: 1.4; }
    .field { display: grid; gap: 6px; margin-top: 16px; font-size: 12px; font-weight: 700; color: #6b6258; }
    .row { display: flex; gap: 8px; }
    .row input { flex: 1; min-width: 0; height: 40px; border: 1px solid #d9cfbf; border-radius: 10px; padding: 0 11px; font: inherit; font-size: 13px; font-weight: 400; background: #fff; color: #241f19; }
    .copy { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border: 0; border-radius: 10px; background: #8c2f1f; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .copy:hover { background: #75261a; }
    .channels { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 12px; font-size: 12px; color: #6b6258; }
    .channels a { padding: 6px 12px; border: 1px solid #d9cfbf; border-radius: 999px; color: #241f19; text-decoration: none; font-weight: 600; font-size: 12.5px; }
    .channels a:hover { border-color: #8c2f1f; color: #8c2f1f; }
    .list { list-style: none; margin: 18px 0 0; padding: 0; display: grid; gap: 6px; border-top: 1px solid #eee6d9; padding-top: 14px; }
    .list li { display: flex; align-items: center; gap: 8px; border: 1px solid #e4dccf; border-radius: 10px; padding: 4px 6px 4px 4px; }
    .list li.on { border-color: #8c2f1f; background: #fbf3ef; }
    .pick { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px; text-align: left; border: 0; background: none; padding: 8px 8px; cursor: pointer; font: inherit; color: inherit; }
    .pick strong { font-size: 13.5px; }
    .pick span { font-size: 12px; color: #8a8076; }
    .mini { border: 1px solid #d9cfbf; background: #fff; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    @media (max-width: 520px) {
      .backdrop { align-items: flex-end; padding: 0; }
      .dialog { border-radius: 16px 16px 0 0; max-height: 94vh; }
      .row { flex-direction: column; }
      .copy { justify-content: center; }
    }
  `],
})
export class ShareDialogComponent {
  readonly heading = input.required<string>();
  readonly intro = input<string>('');
  readonly items = input.required<ShareItem[]>();
  readonly closed = output<void>();

  protected readonly selectedId = signal<string | null>(null);
  protected readonly copiedId = signal<string | null>(null);
  protected readonly imageFailed = signal(false);
  protected readonly selected = computed(() => {
    const list = this.items();
    return list.find((item) => item.id === this.selectedId()) ?? list[0] ?? null;
  });

  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  protected select(id: string): void {
    this.selectedId.set(id);
    this.imageFailed.set(false);
  }

  protected async copy(item: ShareItem): Promise<void> {
    if (!(await copyText(item.url))) return;
    this.copiedId.set(item.id);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copiedId.set(null), 2200);
  }

  protected telegram(item: ShareItem): string { return telegramShareUrl(item.url, item.title); }
  protected whatsapp(item: ShareItem): string { return whatsappShareUrl(item.url, item.title); }
  protected facebook(item: ShareItem): string { return facebookShareUrl(item.url); }
}
