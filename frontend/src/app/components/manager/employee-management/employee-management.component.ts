import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';

import { DataTableComponent, TableColumn, TableAction } from '../../shared/data-table/data-table.component';
import { DynamicFormComponent, FormField } from '../../shared/dynamic-form/dynamic-form.component';
import { ApiService, Employee } from '../../../services/api.service';

@Component({
  selector: 'app-employee-management',
  standalone: true,
  imports: [
    CommonModule,
    DataTableComponent,
    DynamicFormComponent,
    ToastModule,
    CardModule,
    ButtonModule,
    TabsModule
  ],
  providers: [MessageService],
  template: `
    <div class="p-6">
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4 bg-blue-50">
            <div class="flex items-center">
              <i class="pi pi-users text-3xl text-blue-600 mr-3"></i>
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Employee Management</h2>
                <p class="text-gray-600">Manage employee information, profiles, and availability</p>
              </div>
            </div>
          </div>
        </ng-template>

        <app-data-table
          [data]="employees"
          [columns]="tableColumns"
          [actions]="tableActions"
          [loading]="loading"
          title="Employees"
          (add)="openAddDialog()">
        </app-data-table>
      </p-card>

      <app-dynamic-form
        [visible]="showDialog"
        [title]="dialogTitle"
        [fields]="formFields"
        [data]="selectedEmployee"
        [loading]="formLoading"
        [submitLabel]="isEditing ? 'Update' : 'Create'"
        (submittedForm)="saveEmployee($event)"
        (canceledForm)="closeDialog()">
      </app-dynamic-form>

      <p-toast></p-toast>
    </div>
  `,
  styles: []
})
export class EmployeeManagementComponent implements OnInit {
  employees: Employee[] = [];
  selectedEmployee: Employee | null = null;
  showDialog = false;
  isEditing = false;
  loading = false;
  formLoading = false;

  tableColumns: TableColumn[] = [
    { field: 'code', header: 'Employee Code', sortable: true, width: '120px' },
    { field: 'name', header: 'Name', sortable: true },
    { field: 'email', header: 'Email', sortable: true },
    { field: 'phone', header: 'Phone', width: '140px' },
    {
      field: 'type',
      header: 'Type',
      type: 'tag',
      width: '100px',
      tagSeverity: (value) => value === 'junior' ? 'success' : 'info',
      tagValue: (value) => value.charAt(0).toUpperCase() + value.slice(1)
    },
    {
      field: 'fullTime',
      header: 'Employment',
      type: 'tag',
      width: '120px',
      tagSeverity: (value) => value ? 'success' : 'warning',
      tagValue: (value) => value ? 'Full-time' : 'Part-time'
    },
    { field: 'salaryByHour', header: 'Hourly Rate', type: 'currency', width: '120px' },
    { field: 'isActive', header: 'Status', type: 'boolean', width: '100px' },
    { field: 'actions', header: 'Actions', type: 'actions', width: '120px' }
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-eye',
      label: 'View',
      severity: 'info',
      action: (employee) => this.viewEmployee(employee)
    },
    {
      icon: 'pi pi-pencil',
      label: 'Edit',
      severity: 'secondary',
      action: (employee) => this.editEmployee(employee)
    },
    {
      icon: 'pi pi-trash',
      label: 'Delete',
      severity: 'danger',
      action: (employee) => this.deleteEmployee(employee),
      visible: (employee) => !employee.isActive
    }
  ];

  formFields: FormField[] = [
    { key: 'code', label: 'Employee Code', type: 'text', required: true, placeholder: 'e.g., EMP001', colspan: 6 },
    { key: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name', colspan: 6 },
    { key: 'email', label: 'Email Address', type: 'email', required: false, placeholder: 'employee@cinema.com', colspan: 6 },
    { key: 'phone', label: 'Phone Number', type: 'text', required: false, placeholder: '+1 (555) 123-4567', colspan: 6 },
    {
      key: 'type',
      label: 'Employee Type',
      type: 'select',
      required: true,
      options: [
        { label: 'New Employee', value: 'new' },
        { label: 'Junior Employee', value: 'junior' }
      ],
      colspan: 6
    },
    {
      key: 'fullTime',
      label: 'Full-time Employment',
      type: 'checkbox',
      placeholder: 'Check if this is a full-time position',
      colspan: 6
    },
    {
      key: 'salaryByHour',
      label: 'Hourly Rate ($)',
      type: 'number',
      required: true,
      min: 7.25,
      max: 100,
      placeholder: '15.00',
      colspan: 6
    },
    {
      key: 'isActive',
      label: 'Active Status',
      type: 'checkbox',
      placeholder: 'Check to activate employee account',
      colspan: 6
    }
  ];

  private apiService = inject(ApiService);
  private messageService = inject(MessageService);

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.apiService.getEmployees().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load employees'
        });
        this.loading = false;
      }
    });
  }

  openAddDialog(): void {
    this.selectedEmployee = null;
    this.isEditing = false;
    this.showDialog = true;
  }

  viewEmployee(employee: Employee): void {
    this.selectedEmployee = { ...employee };
    this.isEditing = false;
    // Make all fields disabled for view mode
    this.formFields = this.formFields.map(field => ({ ...field, disabled: true }));
    this.showDialog = true;
  }

  editEmployee(employee: Employee): void {
    this.selectedEmployee = { ...employee };
    this.isEditing = true;
    // Enable all fields for edit mode
    this.formFields = this.formFields.map(field => ({ ...field, disabled: false }));
    this.showDialog = true;
  }

  saveEmployee(formData: any): void {
    this.formLoading = true;

    const employeeData = {
      ...formData,
      availability: this.selectedEmployee?.availability || []
    };

    const operation = this.isEditing
      ? this.apiService.updateEmployee(this.selectedEmployee!._id!, employeeData)
      : this.apiService.createEmployee(employeeData);

    operation.subscribe({
      next: (employee) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Employee ${this.isEditing ? 'updated' : 'created'} successfully`
        });
        this.loadEmployees();
        this.closeDialog();
        this.formLoading = false;
      },
      error: (error) => {
        console.error('Error saving employee:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${this.isEditing ? 'update' : 'create'} employee`
        });
        this.formLoading = false;
      }
    });
  }

  deleteEmployee(employee: Employee): void {
    if (employee._id) {
      this.apiService.deleteEmployee(employee._id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Employee deleted successfully'
          });
          this.loadEmployees();
        },
        error: (error) => {
          console.error('Error deleting employee:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete employee'
          });
        }
      });
    }
  }

  closeDialog(): void {
    this.showDialog = false;
    this.selectedEmployee = null;
    this.formLoading = false;
    // Reset field disabled state
    this.formFields = this.formFields.map(field => ({ ...field, disabled: false }));
  }

  get dialogTitle(): string {
    if (!this.showDialog) return '';
    if (this.isEditing) return `Edit Employee - ${this.selectedEmployee?.name}`;
    if (this.selectedEmployee && !this.isEditing) return `View Employee - ${this.selectedEmployee.name}`;
    return 'Add New Employee';
  }
}
