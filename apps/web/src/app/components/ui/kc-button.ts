import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'light' | 'outline-light' | 'mint';

@Component({
  selector: 'kc-button',
  imports: [RouterLink],
  template: `
    @if (href()) {
      <a
        [routerLink]="href()"
        [class]="classes()"
      >
        <ng-content />
      </a>
    } @else {
      <button [type]="type()" [class]="classes()">
        <ng-content />
      </button>
    }
  `,
})
export class KcButton {
  variant = input<ButtonVariant>('primary');
  href = input<string | undefined>(undefined);
  type = input<'button' | 'submit'>('button');
  fullWidth = input(false);
  rounded = input<'lg' | 'xl' | 'full'>('lg');

  classes(): string {
    const roundedClass = {
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    }[this.rounded()];

    const base = `inline-flex items-center justify-center gap-2 ${roundedClass} px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer`;
    const width = this.fullWidth() ? ' w-full' : '';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-[#1b4332] text-white hover:bg-[#2d6a4f] shadow-xs active:scale-[0.99]',
      secondary:
        'border border-gray-300 text-gray-800 bg-[#f7f8f6] hover:bg-gray-100 shadow-xs',
      ghost: 'text-[#1b4332] hover:bg-[#d8f3dc]',
      light: 'bg-white text-[#1b4332] hover:bg-[#d8f3dc] shadow-xs',
      mint: 'bg-[#b7e4c7] text-[#1b4332] hover:bg-[#95d5b2] font-bold shadow-xs',
      'outline-light':
        'border border-white/40 text-white bg-white/10 hover:bg-white/20',
    };

    return base + width + ' ' + variants[this.variant()];
  }
}
