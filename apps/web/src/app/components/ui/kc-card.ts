import { Component, input } from '@angular/core';

@Component({
  selector: 'kc-card',
  template: `
    <div [class]="classes()">
      <ng-content />
    </div>
  `,
})
export class KcCard {
  padding = input<'sm' | 'md' | 'lg'>('md');
  hover = input(false);

  classes(): string {
    const paddingMap = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverClass = this.hover()
      ? ' hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200'
      : '';

    return (
      'rounded-2xl bg-white shadow-md border border-gray-100' +
      hoverClass +
      ' ' +
      paddingMap[this.padding()]
    );
  }
}
