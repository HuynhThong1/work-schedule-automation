import { Component, Input, Output, OnInit, OnChanges, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'password' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  disabled?: boolean;
  validators?: any[];
  colspan?: number; // For grid layout (1-12)
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    DatePickerModule,
    TextareaModule,
    ButtonModule,
    DialogModule,
    MessageModule,
    FloatLabelModule,
    IconFieldModule,
    InputIconModule,
    DividerModule,
    ProgressSpinnerModule
  ],
  template: `
    <p-dialog
      [header]="title"
      [modal]="true"
      [visible]="visible"
      [style]="{ width: width, minHeight: '400px' }"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      styleClass="modern-dialog"
      (onHide)="onCancel()">

      <!-- Loading Overlay -->
      <div *ngIf="loading" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
        <div class="flex flex-col items-center">
          <p-progressSpinner [style]="{ width: '50px', height: '50px' }" strokeWidth="4"></p-progressSpinner>
          <p class="mt-3 text-gray-600 font-medium">Processing...</p>
        </div>
      </div>

      <!-- Form Header -->
      <div class="mb-6 pb-4 border-b border-gray-100">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <i class="pi pi-user text-white text-lg"></i>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ getFormSubtitle() }}</h3>
            <p class="text-sm text-gray-500">Fill in the information below</p>
          </div>
        </div>
      </div>

              <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Form Fields Grid -->
        <div class="grid grid-cols-12 gap-6">
          <div
            *ngFor="let field of fields; trackBy: trackByField"
            [class]="'col-span-12 ' + (field.colspan === 6 ? 'md:col-span-6' : '')"
            class="form-field-container">

            <ng-container [ngSwitch]="field.type">
              <!-- Text Input with Float Label -->
              <p-floatLabel *ngSwitchCase="'text'" class="w-full">
                <p-iconField iconPosition="left" class="w-full">
                  <p-inputIcon>
                    <i [class]="getFieldIcon(field.key)"></i>
                  </p-inputIcon>
                  <input
                    pInputText
                    [id]="field.key"
                    [formControlName]="field.key"
                    [disabled]="field.disabled || false"
                    class="w-full form-input"
                    [class.error]="form.get(field.key)?.invalid && form.get(field.key)?.touched" />
                </p-iconField>
                <label [for]="field.key">
                  {{ field.label }}
                  <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                </label>
              </p-floatLabel>

              <!-- Email Input with Float Label -->
              <p-floatLabel *ngSwitchCase="'email'" class="w-full">
                <p-iconField iconPosition="left" class="w-full">
                  <p-inputIcon>
                    <i class="pi pi-envelope"></i>
                  </p-inputIcon>
                  <input
                    pInputText
                    type="email"
                    [id]="field.key"
                    [formControlName]="field.key"
                    [disabled]="field.disabled || false"
                    class="w-full form-input"
                    [class.error]="form.get(field.key)?.invalid && form.get(field.key)?.touched" />
                </p-iconField>
                <label [for]="field.key">
                  {{ field.label }}
                  <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                </label>
              </p-floatLabel>

              <!-- Password Input with Float Label -->
              <p-floatLabel *ngSwitchCase="'password'" class="w-full">
                <p-iconField iconPosition="left" class="w-full">
                  <p-inputIcon>
                    <i class="pi pi-lock"></i>
                  </p-inputIcon>
                  <input
                    pInputText
                    type="password"
                    [id]="field.key"
                    [formControlName]="field.key"
                    [disabled]="field.disabled || false"
                    class="w-full form-input"
                    [class.error]="form.get(field.key)?.invalid && form.get(field.key)?.touched" />
                </p-iconField>
                <label [for]="field.key">
                  {{ field.label }}
                  <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                </label>
              </p-floatLabel>

              <!-- Number Input with Float Label -->
              <p-floatLabel *ngSwitchCase="'number'" class="w-full">
                <p-inputNumber
                  [id]="field.key"
                  [formControlName]="field.key"
                  [disabled]="field.disabled || false"
                  [min]="field.min || 0"
                  [max]="field.max || 999999"
                  [showButtons]="true"
                  mode="decimal"
                  [minFractionDigits]="2"
                  [maxFractionDigits]="2"
                  class="w-full form-input"
                  [class.error]="form.get(field.key)?.invalid && form.get(field.key)?.touched"
                  currency="USD"
                  locale="en-US">
                </p-inputNumber>
                <label [for]="field.key">
                  {{ field.label }}
                  <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                </label>
              </p-floatLabel>

              <!-- Textarea with Float Label -->
              <p-floatLabel *ngSwitchCase="'textarea'" class="w-full">
                <textarea
                  pInputTextarea
                  [id]="field.key"
                  [formControlName]="field.key"
                  [disabled]="field.disabled || false"
                  rows="4"
                  class="w-full form-input resize-none"
                  [class.error]="form.get(field.key)?.invalid && form.get(field.key)?.touched">
                </textarea>
                <label [for]="field.key">
                  {{ field.label }}
                  <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                </label>
              </p-floatLabel>

              <!-- Select Dropdown with Float Label -->
              <p-floatLabel *ngSwitchCase="'select'" class="w-full">
                <p-select
                  [id]="field.key"
                  [formControlName]="field.key"
                  [options]="field.options"
                  [disabled]="field.disabled || false"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full form-input"
                  [class.error]="form.get(field.key)?.invalid && form.get(field.key)?.touched"
                  [showClear]="true">
                </p-select>
                <label [for]="field.key">
                  {{ field.label }}
                  <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                </label>
              </p-floatLabel>

              <!-- Checkbox with Custom Styling -->
              <div *ngSwitchCase="'checkbox'" class="checkbox-container">
                <div class="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <p-checkbox
                    [id]="field.key"
                    [formControlName]="field.key"
                    [disabled]="field.disabled || false"
                    [binary]="true"
                    class="mr-3">
                  </p-checkbox>
                  <div class="flex-1">
                    <label [for]="field.key" class="font-medium text-gray-900 cursor-pointer">
                      {{ field.label }}
                      <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                    </label>
                    <p *ngIf="field.placeholder" class="text-sm text-gray-600 mt-1">{{ field.placeholder }}</p>
                  </div>
                </div>
              </div>

              <!-- Date Picker with Float Label -->
              <p-floatLabel *ngSwitchCase="'date'" class="w-full">
                <p-datepicker
                  [id]="field.key"
                  [formControlName]="field.key"
                  [disabled]="field.disabled || false"
                  dateFormat="mm/dd/yy"
                  [showIcon]="true"
                  iconDisplay="input"
                  class="w-full form-input"
                  [class.error]="form.get(field.key)?.invalid && form.get(field.key)?.touched">
                </p-datepicker>
                <label [for]="field.key">
                  {{ field.label }}
                  <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                </label>
              </p-floatLabel>

              <!-- Time Picker with Float Label -->
              <p-floatLabel *ngSwitchCase="'time'" class="w-full">
                <p-datepicker
                  [id]="field.key"
                  [formControlName]="field.key"
                  [disabled]="field.disabled || false"
                  [timeOnly]="true"
                  [showIcon]="true"
                  iconDisplay="input"
                  class="w-full form-input"
                  [class.error]="form.get(field.key)?.invalid && form.get(field.key)?.touched">
                </p-datepicker>
                <label [for]="field.key">
                  {{ field.label }}
                  <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
                </label>
              </p-floatLabel>
            </ng-container>

            <!-- Field Errors with Animation -->
            <div *ngIf="form.get(field.key)?.invalid && form.get(field.key)?.touched"
                 class="error-message mt-2 animate-fade-in">
              <div class="flex items-center text-red-600 text-sm">
                <i class="pi pi-exclamation-circle mr-2"></i>
                <span>{{ getFieldError(field.key) }}</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="border-t border-gray-100 pt-6 mt-6">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-500 flex">
              <i class="pi pi-info-circle mr-2 text-gray-400"></i>
              Fields marked with <span class="text-red-500 mx-1">*</span> are required
            </div>
            <div class="flex gap-3">
              <p-button
                label="Cancel"
                icon="pi pi-times"
                [text]="true"
                (onClick)="onCancel()"
                class="cancel-btn">
              </p-button>
              <p-button
                [label]="submitLabel"
                icon="pi pi-check"
                [loading]="loading"
                [disabled]="form.invalid"
                (onClick)="onSubmit()"
                class="submit-btn">
              </p-button>
            </div>
          </div>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    /* Dialog Styling */
    :host ::ng-deep .modern-dialog .p-dialog-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
      padding: 1.5rem;
      border: none;
    }

    :host ::ng-deep .modern-dialog .p-dialog-header .p-dialog-title {
      font-weight: 600;
      font-size: 1.25rem;
    }

    :host ::ng-deep .modern-dialog .p-dialog-header .p-dialog-header-icon {
      color: white;
      width: 2rem;
      height: 2rem;
    }

    :host ::ng-deep .modern-dialog .p-dialog-content {
      padding: 2rem;
      background: #fafafa;
      position: relative;
    }

    :host ::ng-deep .modern-dialog .p-dialog-footer {
      padding: 0 2rem 2rem 2rem;
      background: white;
      border-radius: 0 0 12px 12px;
      border: none;
    }

    :host ::ng-deep .modern-dialog {
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: none;
    }

    /* Form Field Styling */
    .form-field-container {
      transition: all 0.3s ease;
    }

    /* Consistent Field Heights */
    :host ::ng-deep .form-input input,
    :host ::ng-deep .form-input .p-inputnumber-input,
    :host ::ng-deep .form-input .p-dropdown,
    :host ::ng-deep .form-input .p-calendar,
    :host ::ng-deep .form-input .p-select,
    :host ::ng-deep .form-input textarea {
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.875rem 1rem;
      font-size: 0.95rem;
      transition: all 0.3s ease;
      background: white;
      height: 3.5rem;
      min-height: 3.5rem;
      line-height: 1.5;
    }

    /* Textarea Exception */
    :host ::ng-deep .form-input textarea {
      height: auto;
      min-height: 6rem;
      resize: vertical;
      padding-top: 0.875rem;
      padding-bottom: 0.875rem;
    }

    :host ::ng-deep .form-input input:focus,
    :host ::ng-deep .form-input .p-inputnumber-input:focus,
    :host ::ng-deep .form-input .p-dropdown:focus-within,
    :host ::ng-deep .form-input .p-calendar:focus-within,
    :host ::ng-deep .form-input textarea:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      outline: none;
    }

    :host ::ng-deep .form-input.error input,
    :host ::ng-deep .form-input.error .p-inputnumber-input,
    :host ::ng-deep .form-input.error .p-dropdown,
    :host ::ng-deep .form-input.error .p-calendar,
    :host ::ng-deep .form-input.error textarea {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    /* Float Label Styling */
    :host ::ng-deep .p-float-label {
      width: 100%;
      position: relative;
    }

    :host ::ng-deep .p-float-label label {
      color: #6b7280;
      font-weight: 500;
      transition: all 0.3s ease;
      font-size: 0.875rem;
    }

    :host ::ng-deep .p-float-label input:focus ~ label,
    :host ::ng-deep .p-float-label input.p-filled ~ label,
    :host ::ng-deep .p-float-label .p-inputwrapper-focus ~ label,
    :host ::ng-deep .p-float-label .p-inputwrapper-filled ~ label {
      color: #667eea;
      font-weight: 600;
    }

    /* Ensure all components fill their containers */
    :host ::ng-deep .p-icon-field {
      width: 100%;
    }

    /* Icon Field Styling */
    :host ::ng-deep .p-icon-field .p-input-icon {
      color: #9ca3af;
      transition: color 0.3s ease;
      top: 50%;
      transform: translateY(-50%);
    }

    :host ::ng-deep .p-icon-field:focus-within .p-input-icon {
      color: #667eea;
    }

    /* Input Number Styling */
    :host ::ng-deep .p-inputnumber {
      width: 100%;
      height: 3.5rem;
    }

    :host ::ng-deep .p-inputnumber .p-inputnumber-input {
      height: 3.5rem !important;
      padding-right: 3rem;
    }

    :host ::ng-deep .p-inputnumber .p-inputnumber-button-group {
      height: 3.5rem;
    }

    :host ::ng-deep .p-inputnumber .p-inputnumber-button {
      border-radius: 0 8px 8px 0;
      border-color: #e5e7eb;
      height: 1.75rem;
      width: 2.5rem;
    }

    :host ::ng-deep .p-inputnumber .p-inputnumber-button:hover {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }

    /* Select Dropdown Styling */
    :host ::ng-deep .p-select {
      width: 100%;
      height: 3.5rem;
    }

    :host ::ng-deep .p-select .p-select-label {
      padding: 0.875rem 1rem;
      height: 3.5rem;
      display: flex;
      align-items: center;
    }

    :host ::ng-deep .p-select .p-select-dropdown {
      border-radius: 0 8px 8px 0;
      border-color: #e5e7eb;
      height: 3.5rem;
      width: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Calendar Styling */
    :host ::ng-deep .p-datepicker {
      width: 100%;
      height: 3.5rem;
    }

    :host ::ng-deep .p-datepicker .p-datepicker-input {
      height: 3.5rem !important;
      padding-right: 3rem;
    }

    :host ::ng-deep .p-datepicker .p-datepicker-dropdown {
      border-radius: 0 8px 8px 0;
      border-color: #e5e7eb;
      height: 3.5rem;
      width: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Checkbox Styling */
    :host ::ng-deep .checkbox-container {
      min-height: 3.5rem;
    }

    :host ::ng-deep .checkbox-container > div {
      min-height: 3.5rem;
      display: flex;
      align-items: center;
    }

    :host ::ng-deep .checkbox-container .p-checkbox {
      width: 1.25rem;
      height: 1.25rem;
    }

    :host ::ng-deep .checkbox-container .p-checkbox .p-checkbox-box {
      border: 2px solid #d1d5db;
      border-radius: 4px;
      transition: all 0.3s ease;
      width: 1.25rem;
      height: 1.25rem;
    }

    :host ::ng-deep .checkbox-container .p-checkbox .p-checkbox-box:hover {
      border-color: #667eea;
    }

    :host ::ng-deep .checkbox-container .p-checkbox .p-checkbox-box.p-highlight {
      background: #667eea;
      border-color: #667eea;
    }

    /* Clean Button Styling */
    :host ::ng-deep .cancel-btn .p-button {
      background: white;
      border: 1px solid #d1d5db;
      color: #6b7280;
      font-weight: 500;
      padding: 0.75rem 2rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      height: 2.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: none;
    }

    :host ::ng-deep .cancel-btn .p-button:hover:not(:disabled) {
      border-color: #9ca3af;
      color: #374151;
      background: #f9fafb;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    :host ::ng-deep .submit-btn .p-button {
      background: #667eea;
      border: 1px solid #667eea;
      color: white;
      font-weight: 500;
      padding: 0.75rem 2rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      height: 2.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    :host ::ng-deep .submit-btn .p-button:hover:not(:disabled) {
      background: #5a67d8;
      border-color: #5a67d8;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }

    :host ::ng-deep .submit-btn .p-button:disabled {
      background: #e5e7eb;
      border-color: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }

    /* Error Message Animation */
    .error-message {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    /* Loading Overlay */
    :host ::ng-deep .p-progress-spinner-circle {
      stroke: #667eea;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      :host ::ng-deep .modern-dialog {
        width: 95vw !important;
        margin: 1rem;
      }

      :host ::ng-deep .modern-dialog .p-dialog-content {
        padding: 1rem;
      }

      .form-field-container.md\\:col-span-6 {
        grid-column: span 12 !important;
      }
    }

    /* Focus Ring for Accessibility */
    :host ::ng-deep *:focus {
      outline: 2px solid transparent;
      outline-offset: 2px;
    }

    :host ::ng-deep *:focus-visible {
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }
  `]
})
export class DynamicFormComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() title = 'Form';
  @Input() fields: FormField[] = [];
  @Input() data: any = null;
  @Input() loading = false;
  @Input() submitLabel = 'Save';
  @Input() width = '50vw';

  submittedForm = output<any>();
  canceledForm = output<void>();

  form: FormGroup = new FormGroup({});

  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(): void {
    if (this.fields.length > 0) {
      this.buildForm();
    }
    if (this.data && this.form) {
      this.form.patchValue(this.data);
    }
  }

  buildForm(): void {
    const formControls: any = {};

    this.fields.forEach(field => {
      const validators = [];

      if (field.required) {
        validators.push(Validators.required);
      }

      if (field.type === 'email') {
        validators.push(Validators.email);
      }

      if (field.validators) {
        validators.push(...field.validators);
      }

      const defaultValue = this.data?.[field.key] !== undefined
        ? this.data[field.key]
        : this.getDefaultValue(field.type);

      formControls[field.key] = [defaultValue, validators];
    });

    this.form = this.fb.group(formControls);
  }

  getDefaultValue(type: string): any {
    switch (type) {
      case 'checkbox':
        return false;
      case 'number':
        return 0;
      default:
        return '';
    }
  }

  getFieldError(fieldKey: string): string {
    const control = this.form.get(fieldKey);
    if (control?.errors) {
      if (control.errors['required']) {
        return 'This field is required';
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors['min']) {
        return `Minimum value is ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `Maximum value is ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.submittedForm.emit(this.form.value);
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  onCancel(): void {
    this.form.reset();
    this.canceledForm.emit();
  }

  markAllFieldsAsTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  getFormSubtitle(): string {
    if (this.title.includes('Add')) return 'Create New Record';
    if (this.title.includes('Edit')) return 'Update Information';
    if (this.title.includes('View')) return 'View Details';
    return 'Form Details';
  }

  getFieldIcon(fieldKey: string): string {
    const iconMap: { [key: string]: string } = {
      'code': 'pi pi-hashtag',
      'name': 'pi pi-user',
      'phone': 'pi pi-phone',
      'salaryByHour': 'pi pi-dollar',
      'capacity': 'pi pi-users',
      'startTime': 'pi pi-clock',
      'endTime': 'pi pi-clock',
      'date': 'pi pi-calendar',
      'description': 'pi pi-file-edit',
      'reason': 'pi pi-comment',
      'notes': 'pi pi-comment'
    };
    return iconMap[fieldKey] || 'pi pi-info-circle';
  }

  trackByField(index: number, field: FormField): string {
    return field.key;
  }
}
