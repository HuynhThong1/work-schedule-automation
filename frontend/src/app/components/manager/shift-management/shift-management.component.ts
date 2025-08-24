import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';

import { DataTableComponent, TableColumn, TableAction } from '../../shared/data-table/data-table.component';
import { DynamicFormComponent, FormField } from '../../shared/dynamic-form/dynamic-form.component';
import { ApiService, Shift, Employee } from '../../../services/api.service';

@Component({
  selector: 'app-shift-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    DynamicFormComponent,
    ToastModule,
    CardModule,
    ButtonModule,
    TabsModule,
  ],
  providers: [MessageService],
  template: `
    <div class="p-6">
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4 bg-green-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i class="pi pi-calendar-plus text-3xl text-green-600 mr-3"></i>
                <div>
                  <h2 class="text-2xl font-bold text-gray-900">Shift Management</h2>
                  <p class="text-gray-600">Create and manage work shifts for employees</p>
                </div>
              </div>
              <div class="flex gap-2">
                <p-datepicker
                  [(ngModel)]="selectedDate"
                  (onSelect)="onDateChange()"
                  placeholder="Filter by date"
                  format="mm/dd/yy">
                </p-datepicker>
                <p-button
                  label="Clear Filter"
                  icon="pi pi-times"
                  severity="secondary"
                  (onClick)="clearDateFilter()">
                </p-button>
              </div>
            </div>
          </div>
        </ng-template>

          <p-tabs value="0">
            <p-tablist>
              <p-tab value="0">
                <i class="pi pi-list mr-2"></i>
                All Shifts
              </p-tab>
              <p-tab value="1">
                <i class="pi pi-calendar mr-2"></i>
                Today's Shifts
              </p-tab>
              <p-tab value="2">
                <i class="pi pi-exclamation-triangle mr-2"></i>
                Unassigned Shifts
              </p-tab>
            </p-tablist>
            <p-tabpanels>
              <p-tabpanel value="0">
                <app-data-table
                  [data]="filteredShifts"
                  [columns]="tableColumns"
                  [actions]="tableActions"
                  [loading]="loading"
                  title="Shifts"
                  (add)="openAddDialog()">
                </app-data-table>
              </p-tabpanel>

              <p-tabpanel value="1">
                <app-data-table
                  [data]="todayShifts"
                  [columns]="tableColumns"
                  [actions]="tableActions"
                  [loading]="loading"
                  title="Today's Shifts"
                  [showAddButton]="false">
                </app-data-table>
              </p-tabpanel>

              <p-tabpanel value="2">
                <app-data-table
                  [data]="unassignedShifts"
                  [columns]="tableColumns"
                  [actions]="assignmentActions"
                  [loading]="loading"
                  title="Unassigned Shifts"
                  [showAddButton]="false">
                </app-data-table>
              </p-tabpanel>
            </p-tabpanels>
          </p-tabs>
      </p-card>

      <app-dynamic-form
        [visible]="showDialog"
        [title]="dialogTitle"
        [fields]="formFields"
        [data]="selectedShift"
        [loading]="formLoading"
        [submitLabel]="isEditing ? 'Update' : 'Create'"
        (submittedForm)="saveShift($event)"
        (canceledForm)="closeDialog()">
      </app-dynamic-form>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    :host ::ng-deep .p-tabview .p-tabview-panels {
      padding: 1rem 0;
    }
  `]
})
export class ShiftManagementComponent implements OnInit {
  shifts: Shift[] = [];
  employees: Employee[] = [];
  selectedShift: Shift | null = null;
  selectedDate: Date | null = null;
  showDialog = false;
  isEditing = false;
  loading = false;
  formLoading = false;

  tableColumns: TableColumn[] = [
    { field: 'date', header: 'Date', type: 'date', sortable: true, width: '120px' },
    { field: 'startTime', header: 'Start Time', width: '100px' },
    { field: 'endTime', header: 'End Time', width: '100px' },
    { field: 'capacity', header: 'Capacity', type: 'number', width: '80px' },
    {
      field: 'assignedEmployees',
      header: 'Assigned',
      width: '100px',
      format: (value) => `${value?.length || 0} assigned`
    },
    {
      field: 'isPublished',
      header: 'Status',
      type: 'tag',
      width: '100px',
      tagSeverity: (value) => value ? 'success' : 'warning',
      tagValue: (value) => value ? 'Published' : 'Draft'
    },
    { field: 'actions', header: 'Actions', type: 'actions', width: '150px' }
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-eye',
      label: 'View',
      severity: 'info',
      action: (shift) => this.viewShift(shift)
    },
    {
      icon: 'pi pi-pencil',
      label: 'Edit',
      severity: 'secondary',
      action: (shift) => this.editShift(shift)
    },
    {
      icon: 'pi pi-users',
      label: 'Assign',
      severity: 'success',
      action: (shift) => this.assignEmployees(shift),
      visible: (shift) => !shift.isPublished
    },
    {
      icon: 'pi pi-send',
      label: 'Publish',
      severity: 'primary',
      action: (shift) => this.publishShift(shift),
      visible: (shift) => !shift.isPublished
    },
    {
      icon: 'pi pi-trash',
      label: 'Delete',
      severity: 'danger',
      action: (shift) => this.deleteShift(shift),
      visible: (shift) => !shift.isPublished
    }
  ];

  assignmentActions: TableAction[] = [
    {
      icon: 'pi pi-users',
      label: 'Auto Assign',
      severity: 'success',
      action: (shift) => this.autoAssignShift(shift)
    },
    {
      icon: 'pi pi-user-plus',
      label: 'Manual Assign',
      severity: 'info',
      action: (shift) => this.assignEmployees(shift)
    }
  ];

  formFields: FormField[] = [
    { key: 'date', label: 'Shift Date', type: 'date', required: true, colspan: 6 },
    { key: 'startTime', label: 'Start Time', type: 'time', required: true, colspan: 3 },
    { key: 'endTime', label: 'End Time', type: 'time', required: true, colspan: 3 },
    {
      key: 'capacity',
      label: 'Employee Capacity',
      type: 'number',
      required: true,
      min: 1,
      max: 20,
      placeholder: '5',
      colspan: 6
    }
  ];

  private apiService = inject(ApiService);
  private messageService = inject(MessageService);

  ngOnInit(): void {
    this.loadShifts();
    this.loadEmployees();
  }

  loadShifts(): void {
    this.loading = true;
    this.apiService.getShifts().subscribe({
      next: (shifts) => {
        this.shifts = shifts;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading shifts:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load shifts'
        });
        this.loading = false;
      }
    });
  }

  loadEmployees(): void {
    this.apiService.getEmployees().subscribe({
      next: (employees) => {
        this.employees = employees.filter(emp => emp.isActive);
      },
      error: (error) => {
        console.error('Error loading employees:', error);
      }
    });
  }

  get filteredShifts(): Shift[] {
    if (!this.selectedDate) return this.shifts;

    const filterDate = new Date(this.selectedDate);
    return this.shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate.toDateString() === filterDate.toDateString();
    });
  }

  get todayShifts(): Shift[] {
    const today = new Date();
    return this.shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate.toDateString() === today.toDateString();
    });
  }

  get unassignedShifts(): Shift[] {
    return this.shifts.filter(shift =>
      (shift.assignedEmployees?.length || 0) < shift.capacity
    );
  }

  onDateChange(): void {
    // Filter is automatically applied via getter
  }

  clearDateFilter(): void {
    this.selectedDate = null;
  }

  openAddDialog(): void {
    this.selectedShift = null;
    this.isEditing = false;
    this.showDialog = true;
  }

  viewShift(shift: Shift): void {
    this.selectedShift = { ...shift };
    this.isEditing = false;
    this.formFields = this.formFields.map(field => ({ ...field, disabled: true }));
    this.showDialog = true;
  }

  editShift(shift: Shift): void {
    this.selectedShift = { ...shift };
    this.isEditing = true;
    this.formFields = this.formFields.map(field => ({ ...field, disabled: false }));
    this.showDialog = true;
  }

  saveShift(formData: any): void {
    this.formLoading = true;

    const shiftData = {
      ...formData,
      assignedEmployees: this.selectedShift?.assignedEmployees || [],
      manager: 'current-manager-id', // This should come from auth service
      isPublished: false
    };

    const operation = this.isEditing
      ? this.apiService.updateShift(this.selectedShift!._id!, shiftData)
      : this.apiService.createShift(shiftData);

    operation.subscribe({
      next: (shift) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Shift ${this.isEditing ? 'updated' : 'created'} successfully`
        });
        this.loadShifts();
        this.closeDialog();
        this.formLoading = false;
      },
      error: (error) => {
        console.error('Error saving shift:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${this.isEditing ? 'update' : 'create'} shift`
        });
        this.formLoading = false;
      }
    });
  }

  assignEmployees(shift: Shift): void {
    // This would open a dialog to manually assign employees
    this.messageService.add({
      severity: 'info',
      summary: 'Feature Coming Soon',
      detail: 'Employee assignment dialog will be implemented next'
    });
  }

  autoAssignShift(shift: Shift): void {
    if (shift._id) {
      // This would call an auto-assignment API
      this.messageService.add({
        severity: 'info',
        summary: 'Auto Assignment',
        detail: 'Auto-assignment feature will be implemented next'
      });
    }
  }

  publishShift(shift: Shift): void {
    if (shift._id) {
      this.apiService.updateShift(shift._id, { isPublished: true }).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Shift published successfully'
          });
          this.loadShifts();
        },
        error: (error) => {
          console.error('Error publishing shift:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to publish shift'
          });
        }
      });
    }
  }

  deleteShift(shift: Shift): void {
    if (shift._id) {
      this.apiService.deleteShift(shift._id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Shift deleted successfully'
          });
          this.loadShifts();
        },
        error: (error) => {
          console.error('Error deleting shift:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete shift'
          });
        }
      });
    }
  }

  closeDialog(): void {
    this.showDialog = false;
    this.selectedShift = null;
    this.formLoading = false;
    this.formFields = this.formFields.map(field => ({ ...field, disabled: false }));
  }

  get dialogTitle(): string {
    if (!this.showDialog) return '';
    if (this.isEditing) return 'Edit Shift';
    if (this.selectedShift && !this.isEditing) return 'View Shift';
    return 'Create New Shift';
  }
}
