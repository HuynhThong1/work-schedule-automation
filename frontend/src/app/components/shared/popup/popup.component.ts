import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

export interface PopupAction {
  label: string;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'danger';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  action: () => void;
}

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule
  ],
  template: `
    <p-dialog
      [header]="title"
      [modal]="modal"
      [visible]="visible"
      [style]="{ width: width, minHeight: minHeight }"
      [closable]="closable && !loading"
      [draggable]="draggable"
      [resizable]="resizable"
      [dismissableMask]="dismissableMask && !loading"
      [styleClass]="styleClass"
      [position]="position"
      [maximizable]="maximizable"
      (onHide)="handleClose()">

      <!-- Loading Overlay -->
      <div
        *ngIf="loading"
        class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
        <div class="flex flex-col items-center">
          <p-progressSpinner
            [style]="{ width: '50px', height: '50px' }"
            strokeWidth="4">
          </p-progressSpinner>
          <p class="mt-3 text-gray-600 font-medium">{{ loadingText }}</p>
        </div>
      </div>

      <!-- Content -->
      <div class="popup-content" [class.opacity-50]="loading">
        <ng-content></ng-content>

        <!-- Template content if provided -->
        <ng-container *ngIf="contentTemplate">
          <ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
        </ng-container>
      </div>

      <!-- Footer -->
      <ng-template pTemplate="footer" *ngIf="showFooter">
        <div class="flex justify-end gap-2">
          <!-- Custom footer template -->
          <ng-container *ngIf="footerTemplate">
            <ng-container *ngTemplateOutlet="footerTemplate"></ng-container>
          </ng-container>

          <!-- Default footer with actions -->
          <ng-container *ngIf="!footerTemplate && actions.length > 0">
            <p-button
              *ngFor="let action of actions"
              [label]="action.label"
              [severity]="action.severity || 'primary'"
              [icon]="action.icon"
              [loading]="action.loading || loading"
              [disabled]="action.disabled || loading"
              (onClick)="action.action()">
            </p-button>
          </ng-container>

          <!-- Default close button if no actions provided -->
          <ng-container *ngIf="!footerTemplate && actions.length === 0">
            <p-button
              label="Close"
              severity="secondary"
              icon="pi pi-times"
              [disabled]="loading"
              (onClick)="handleClose()">
            </p-button>
          </ng-container>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep .p-dialog {
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    :host ::ng-deep .p-dialog-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
      padding: 1.5rem;
      border: none;
    }

    :host ::ng-deep .p-dialog-header .p-dialog-title {
      font-weight: 600;
      font-size: 1.25rem;
    }

    :host ::ng-deep .p-dialog-header .p-dialog-header-icon {
      color: white;
      width: 2rem;
      height: 2rem;
      transition: all 0.2s ease;
    }

    :host ::ng-deep .p-dialog-header .p-dialog-header-icon:hover {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 6px;
    }

    :host ::ng-deep .p-dialog-content {
      padding: 2rem;
      background: #fafafa;
      position: relative;
    }

    :host ::ng-deep .p-dialog-footer {
      padding: 0 2rem 2rem 2rem;
      background: white;
      border-radius: 0 0 12px 12px;
      border: none;
    }

    .popup-content {
      transition: opacity 0.2s ease;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      :host ::ng-deep .p-dialog {
        width: 95vw !important;
        margin: 1rem;
      }

      :host ::ng-deep .p-dialog-header,
      :host ::ng-deep .p-dialog-content,
      :host ::ng-deep .p-dialog-footer {
        padding: 1rem;
      }
    }

    /* Animation */
    :host ::ng-deep .p-dialog-enter-active {
      animation: popup-enter 0.3s ease-out;
    }

    @keyframes popup-enter {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `]
})
export class PopupComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() width = '600px';
  @Input() minHeight = '400px';
  @Input() modal = true;
  @Input() closable = true;
  @Input() draggable = false;
  @Input() resizable = false;
  @Input() dismissableMask = true;
  @Input() styleClass = '';
  @Input() position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' = 'center';
  @Input() maximizable = false;
  @Input() loading = false;
  @Input() loadingText = 'Processing...';
  @Input() showFooter = true;
  @Input() actions: PopupAction[] = [];
  @Input() contentTemplate?: TemplateRef<unknown>;
  @Input() footerTemplate?: TemplateRef<unknown>;

  @Output() closed = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  handleClose(): void {
    if (!this.loading) {
      this.visible = false;
      this.visibleChange.emit(false);
      this.closed.emit();
    }
  }
}
