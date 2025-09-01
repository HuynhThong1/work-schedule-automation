# Popup Component Usage Guide

## Overview

The `app-popup` component is a reusable, standardized popup/dialog component that provides consistent styling and behavior across the application. It addresses common issues with popup dialogs such as:

- X button not working properly
- Inconsistent styling
- Missing close handlers
- Loading states not handled properly

## Basic Usage

### Simple Popup with Content

```typescript
import { PopupComponent } from './components/shared/popup/popup.component';

@Component({
  imports: [PopupComponent, ...otherImports],
  template: `
    <app-popup
      [visible]="showPopup"
      title="My Popup"
      (closed)="handlePopupClose()">

      <h3>Popup Content</h3>
      <p>This is the content inside the popup.</p>

    </app-popup>
  `
})
export class MyComponent {
  showPopup = false;

  handlePopupClose() {
    this.showPopup = false;
    // Additional cleanup logic
  }
}
```

### Popup with Custom Actions

```typescript
import { PopupAction } from './components/shared/popup/popup.component';

@Component({
  template: `
    <app-popup
      [visible]="showConfirmation"
      title="Confirm Action"
      [actions]="confirmActions"
      (closed)="handleClose()">

      <p>Are you sure you want to proceed?</p>

    </app-popup>
  `
})
export class MyComponent {
  showConfirmation = false;

  confirmActions: PopupAction[] = [
    {
      label: 'Cancel',
      severity: 'secondary',
      action: () => this.handleClose()
    },
    {
      label: 'Confirm',
      severity: 'danger',
      icon: 'pi pi-check',
      action: () => this.handleConfirm()
    }
  ];

  handleClose() {
    this.showConfirmation = false;
  }

  handleConfirm() {
    // Perform action
    this.handleClose();
  }
}
```

### Popup with Loading State

```typescript
@Component({
  template: `
    <app-popup
      [visible]="showForm"
      title="Save Data"
      [loading]="saving"
      loadingText="Saving data..."
      [actions]="saveActions"
      (closed)="handleClose()">

      <form [formGroup]="myForm">
        <!-- Form fields -->
      </form>

    </app-popup>
  `
})
export class MyComponent {
  showForm = false;
  saving = false;

  saveActions: PopupAction[] = [
    {
      label: 'Cancel',
      severity: 'secondary',
      action: () => this.handleClose()
    },
    {
      label: 'Save',
      severity: 'success',
      icon: 'pi pi-save',
      loading: this.saving,
      action: () => this.handleSave()
    }
  ];

  async handleSave() {
    this.saving = true;
    try {
      await this.apiService.saveData(this.myForm.value);
      this.handleClose();
    } finally {
      this.saving = false;
    }
  }
}
```

## Component Properties

### Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `visible` | `boolean` | `false` | Controls popup visibility |
| `title` | `string` | `''` | Popup header title |
| `width` | `string` | `'600px'` | Popup width |
| `minHeight` | `string` | `'400px'` | Minimum popup height |
| `modal` | `boolean` | `true` | Whether popup is modal |
| `closable` | `boolean` | `true` | Whether X button is shown |
| `draggable` | `boolean` | `false` | Whether popup can be dragged |
| `resizable` | `boolean` | `false` | Whether popup can be resized |
| `dismissableMask` | `boolean` | `true` | Whether clicking outside closes popup |
| `styleClass` | `string` | `''` | Additional CSS classes |
| `position` | `string` | `'center'` | Popup position |
| `maximizable` | `boolean` | `false` | Whether popup can be maximized |
| `loading` | `boolean` | `false` | Shows loading overlay |
| `loadingText` | `string` | `'Processing...'` | Loading overlay text |
| `showFooter` | `boolean` | `true` | Whether to show footer |
| `actions` | `PopupAction[]` | `[]` | Array of action buttons |

### Output Events

| Event | Type | Description |
|-------|------|-------------|
| `closed` | `EventEmitter<void>` | Emitted when popup is closed |
| `visibleChange` | `EventEmitter<boolean>` | Emitted when visibility changes |

## PopupAction Interface

```typescript
interface PopupAction {
  label: string;                                        // Button text
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'danger'; // Button style
  icon?: string;                                        // PrimeNG icon class
  loading?: boolean;                                    // Show loading spinner
  disabled?: boolean;                                   // Disable button
  action: () => void;                                   // Click handler
}
```

## Common Patterns

### Confirmation Dialog

```typescript
confirmDelete() {
  this.showConfirmDelete = true;
}

deleteActions: PopupAction[] = [
  {
    label: 'Cancel',
    severity: 'secondary',
    action: () => this.showConfirmDelete = false
  },
  {
    label: 'Delete',
    severity: 'danger',
    icon: 'pi pi-trash',
    action: () => this.performDelete()
  }
];
```

### Form Dialog

```typescript
editItem(item: Item) {
  this.selectedItem = item;
  this.showEditDialog = true;
}

editActions: PopupAction[] = [
  {
    label: 'Cancel',
    severity: 'secondary',
    action: () => this.closeEditDialog()
  },
  {
    label: 'Save',
    severity: 'success',
    icon: 'pi pi-save',
    loading: this.saving,
    disabled: this.editForm.invalid,
    action: () => this.saveItem()
  }
];
```

### Information Dialog

```typescript
showInfo() {
  this.showInfoDialog = true;
}

// No custom actions needed - will show default "Close" button
```

## Best Practices

1. **Always handle the `closed` event** to properly clean up state
2. **Use loading states** for async operations to prevent user confusion
3. **Disable actions during loading** to prevent duplicate operations
4. **Use appropriate severities** for different action types
5. **Provide clear labels** for actions
6. **Consider responsive design** - the component automatically adjusts for mobile

## Migration from PrimeNG Dialog

### Before (PrimeNG Dialog)
```typescript
<p-dialog
  header="My Dialog"
  [modal]="true"
  [visible]="showDialog"
  [style]="{ width: '500px' }"
  [closable]="true"
  (onHide)="closeDialog()">

  <p>Content here</p>

  <ng-template pTemplate="footer">
    <p-button label="Cancel" (onClick)="closeDialog()"></p-button>
    <p-button label="Save" (onClick)="save()"></p-button>
  </ng-template>
</p-dialog>
```

### After (Popup Component)
```typescript
<app-popup
  [visible]="showDialog"
  title="My Dialog"
  [actions]="dialogActions"
  (closed)="closeDialog()">

  <p>Content here</p>

</app-popup>
```

```typescript
dialogActions: PopupAction[] = [
  {
    label: 'Cancel',
    severity: 'secondary',
    action: () => this.closeDialog()
  },
  {
    label: 'Save',
    severity: 'primary',
    action: () => this.save()
  }
];
```

## Styling Customization

The popup component includes default styling that can be customized through:

1. **CSS Custom Properties** (recommended)
2. **styleClass input** for component-specific styles
3. **Global CSS overrides** (use with caution)

### Custom CSS Example
```scss
:host ::ng-deep .my-custom-popup {
  .p-dialog-header {
    background: linear-gradient(135deg, #your-color-1, #your-color-2);
  }
}
```

## Troubleshooting

### Common Issues

1. **Popup doesn't close with X button**
   - Ensure `closable` is set to `true` (default)
   - Check that you're handling the `closed` event properly

2. **Content not showing**
   - Make sure content is placed between `<app-popup>` tags
   - Check that `visible` property is set correctly

3. **Actions not working**
   - Verify `PopupAction` objects have proper `action` functions
   - Check for JavaScript errors in action handlers

4. **Styling issues**
   - Use browser dev tools to inspect applied styles
   - Check for CSS specificity conflicts
