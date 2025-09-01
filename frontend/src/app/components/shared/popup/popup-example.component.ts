import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupComponent, PopupAction } from '../popup/popup.component';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-popup-example',
  standalone: true,
  imports: [
    CommonModule,
    PopupComponent,
    ButtonModule
  ],
  template: `
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-4">Popup Component Examples</h2>

      <div class="flex gap-4 mb-6">
        <p-button
          label="Simple Popup"
          (onClick)="showSimplePopup = true">
        </p-button>

        <p-button
          label="Confirmation Dialog"
          severity="danger"
          (onClick)="showConfirmation = true">
        </p-button>

        <p-button
          label="Loading Example"
          severity="info"
          (onClick)="showLoadingExample = true">
        </p-button>
      </div>

      <!-- Simple Popup -->
      <app-popup
        [visible]="showSimplePopup"
        title="Simple Information"
        width="500px"
        (closed)="showSimplePopup = false">

        <div class="space-y-4">
          <p>This is a simple popup with just an information message.</p>
          <p>Notice how the X button in the header works correctly!</p>
        </div>

      </app-popup>

      <!-- Confirmation Dialog -->
      <app-popup
        [visible]="showConfirmation"
        title="Confirm Delete"
        width="450px"
        [actions]="confirmActions"
        (closed)="showConfirmation = false">

        <div class="flex items-center space-x-4">
          <i class="pi pi-exclamation-triangle text-orange-500 text-3xl"></i>
          <div>
            <h3 class="font-semibold text-gray-900">Are you sure?</h3>
            <p class="text-gray-600">This action cannot be undone.</p>
          </div>
        </div>

      </app-popup>

      <!-- Loading Example -->
      <app-popup
        [visible]="showLoadingExample"
        title="Processing Data"
        width="500px"
        [loading]="isProcessing"
        loadingText="Please wait..."
        [actions]="loadingActions"
        (closed)="handleLoadingClose()">

        <div class="space-y-4">
          <p>Click "Start Process" to see the loading state in action.</p>
          <p>Notice how the X button is disabled during loading!</p>
        </div>

      </app-popup>
    </div>
  `
})
export class PopupExampleComponent {
  showSimplePopup = false;
  showConfirmation = false;
  showLoadingExample = false;
  isProcessing = false;

  confirmActions: PopupAction[] = [
    {
      label: 'Cancel',
      severity: 'secondary',
      icon: 'pi pi-times',
      action: () => this.showConfirmation = false
    },
    {
      label: 'Delete',
      severity: 'danger',
      icon: 'pi pi-trash',
      action: () => {
        // Simulate delete action
        console.log('Item deleted!');
        this.showConfirmation = false;
      }
    }
  ];

  loadingActions: PopupAction[] = [
    {
      label: 'Cancel',
      severity: 'secondary',
      action: () => this.handleLoadingClose()
    },
    {
      label: 'Start Process',
      severity: 'success',
      icon: 'pi pi-play',
      loading: this.isProcessing,
      action: () => this.startProcess()
    }
  ];

  startProcess(): void {
    this.isProcessing = true;

    // Simulate async operation
    setTimeout(() => {
      this.isProcessing = false;
      this.showLoadingExample = false;
      console.log('Process completed!');
    }, 3000);
  }

  handleLoadingClose(): void {
    if (!this.isProcessing) {
      this.showLoadingExample = false;
    }
  }
}
