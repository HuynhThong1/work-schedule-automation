import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-feature-placeholder',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  template: `
    <div class="p-6">
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4 bg-blue-50">
            <i class="pi pi-cog text-3xl text-blue-600"></i>
          </div>
        </ng-template>
        <h2 class="text-2xl font-bold mb-4">{{ getFeatureName() }}</h2>
        <p class="text-gray-600 mb-4">
          This feature is under development. Current route: <strong>{{ currentRoute }}</strong>
        </p>
        <p class="text-sm text-gray-500 mb-4">
          This placeholder component shows that routing is working correctly.
        </p>
        <p-button
          label="Back to Dashboard"
          icon="pi pi-arrow-left"
          (click)="goToDashboard()"
          styleClass="p-button-outlined">
        </p-button>
      </p-card>
    </div>
  `,
  styles: []
})
export class FeaturePlaceholderComponent implements OnInit {
  currentRoute: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentRoute = this.router.url;
  }

  getFeatureName(): string {
    const segments = this.currentRoute.split('/');
    const feature = segments[segments.length - 1];
    return feature.charAt(0).toUpperCase() + feature.slice(1);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
