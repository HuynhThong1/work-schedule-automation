import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';

import { DataTableComponent, TableColumn, TableAction } from '../../shared/data-table/data-table.component';
import { DynamicFormComponent, FormField } from '../../shared/dynamic-form/dynamic-form.component';
import { ApiService, Rule } from '../../../services/api.service';

@Component({
  selector: 'app-rules-management',
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
          <div class="p-4 bg-orange-50">
            <div class="flex items-center">
              <i class="pi pi-list text-3xl text-orange-600 mr-3"></i>
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Rules Management</h2>
                <p class="text-gray-600">Configure scheduling rules and policies for automated assignment</p>
              </div>
            </div>
          </div>
        </ng-template>

        <p-tabs value="0">
          <p-tablist>
            <p-tab value="0">
              <i class="pi pi-list mr-2"></i>
              All Rules
            </p-tab>
            <p-tab value="1">
              <i class="pi pi-check-circle mr-2"></i>
              Active Rules
            </p-tab>
            <p-tab value="2">
              <i class="pi pi-clone mr-2"></i>
              Rule Templates
            </p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="0">
              <app-data-table
                [data]="rules"
                [columns]="tableColumns"
                [actions]="tableActions"
                [loading]="loading"
                title="Scheduling Rules"
                (add)="openAddDialog()">
              </app-data-table>
            </p-tabpanel>

            <p-tabpanel value="1">
              <app-data-table
                [data]="activeRules"
                [columns]="tableColumns"
                [actions]="activeRuleActions"
                [loading]="loading"
                title="Active Rules"
                [showAddButton]="false">
              </app-data-table>
            </p-tabpanel>

            <p-tabpanel value="2">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <p-card *ngFor="let template of ruleTemplates" class="cursor-pointer hover:shadow-lg transition-shadow">
                  <ng-template pTemplate="header">
                    <div class="p-4 bg-blue-50">
                      <i [class]="template.icon + ' text-2xl text-blue-600'"></i>
                    </div>
                  </ng-template>
                  <h4 class="text-lg font-semibold mb-2">{{ template.name }}</h4>
                  <p class="text-gray-600 text-sm mb-4">{{ template.description }}</p>
                  <p-button
                    label="Use Template"
                    icon="pi pi-plus"
                    size="small"
                    (onClick)="useTemplate(template)"
                    styleClass="w-full">
                  </p-button>
                </p-card>
              </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </p-card>

      <app-dynamic-form
        [visible]="showDialog"
        [title]="dialogTitle"
        [fields]="formFields"
        [data]="selectedRule"
        [loading]="formLoading"
        [submitLabel]="isEditing ? 'Update' : 'Create'"
        (submittedForm)="saveRule($event)"
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
export class RulesManagementComponent implements OnInit {
  rules: Rule[] = [];
  selectedRule: Rule | null = null;
  showDialog = false;
  isEditing = false;
  loading = false;
  formLoading = false;

  tableColumns: TableColumn[] = [
    { field: 'name', header: 'Rule Name', sortable: true },
    { field: 'description', header: 'Description', width: '300px' },
    {
      field: 'type',
      header: 'Type',
      type: 'tag',
      width: '120px',
      tagSeverity: (value) => {
        switch(value) {
          case 'assignment': return 'info';
          case 'constraint': return 'warning';
          case 'priority': return 'success';
          default: return 'secondary';
        }
      },
      tagValue: (value) => value.charAt(0).toUpperCase() + value.slice(1)
    },
    { field: 'isActive', header: 'Status', type: 'boolean', width: '100px' },
    { field: 'createdAt', header: 'Created', type: 'date', width: '120px' },
    { field: 'actions', header: 'Actions', type: 'actions', width: '150px' }
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-eye',
      label: 'View',
      severity: 'info',
      action: (rule) => this.viewRule(rule)
    },
    {
      icon: 'pi pi-pencil',
      label: 'Edit',
      severity: 'secondary',
      action: (rule) => this.editRule(rule)
    },
    {
      icon: 'pi pi-check',
      label: 'Activate',
      severity: 'success',
      action: (rule) => this.toggleRuleStatus(rule, true),
      visible: (rule) => !rule.isActive
    },
    {
      icon: 'pi pi-times',
      label: 'Deactivate',
      severity: 'danger',
      action: (rule) => this.toggleRuleStatus(rule, false),
      visible: (rule) => rule.isActive
    },
    {
      icon: 'pi pi-trash',
      label: 'Delete',
      severity: 'danger',
      action: (rule) => this.deleteRule(rule),
      visible: (rule) => !rule.isActive
    }
  ];

  activeRuleActions: TableAction[] = [
    {
      icon: 'pi pi-eye',
      label: 'View',
      severity: 'info',
      action: (rule) => this.viewRule(rule)
    },
    {
      icon: 'pi pi-times',
      label: 'Deactivate',
      severity: 'danger',
      action: (rule) => this.toggleRuleStatus(rule, false)
    }
  ];

  formFields: FormField[] = [
    { key: 'name', label: 'Rule Name', type: 'text', required: true, placeholder: 'e.g., Minimum Staff per Shift', colspan: 6 },
    {
      key: 'type',
      label: 'Rule Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Assignment Rule', value: 'assignment' },
        { label: 'Constraint Rule', value: 'constraint' },
        { label: 'Priority Rule', value: 'priority' }
      ],
      colspan: 6
    },
    { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe what this rule does...', colspan: 12 },
    {
      key: 'isActive',
      label: 'Activate Rule',
      type: 'checkbox',
      placeholder: 'Check to activate this rule immediately',
      colspan: 6
    }
  ];

  ruleTemplates = [
    {
      name: 'Minimum Staff',
      description: 'Ensure minimum number of staff per shift',
      icon: 'pi pi-users',
      template: {
        name: 'Minimum Staff per Shift',
        type: 'constraint',
        description: 'Ensures each shift has at least the minimum required staff',
        parameters: { minStaff: 2 }
      }
    },
    {
      name: 'Senior Priority',
      description: 'Prioritize senior employees for prime shifts',
      icon: 'pi pi-star',
      template: {
        name: 'Senior Employee Priority',
        type: 'priority',
        description: 'Gives priority to junior employees for better shifts',
        parameters: { priorityType: 'experience' }
      }
    },
    {
      name: 'Max Hours',
      description: 'Limit maximum hours per employee per week',
      icon: 'pi pi-clock',
      template: {
        name: 'Maximum Weekly Hours',
        type: 'constraint',
        description: 'Prevents employees from working more than maximum hours per week',
        parameters: { maxHours: 40 }
      }
    },
    {
      name: 'Fair Distribution',
      description: 'Distribute shifts fairly among employees',
      icon: 'pi pi-balance-scale',
      template: {
        name: 'Fair Shift Distribution',
        type: 'assignment',
        description: 'Ensures shifts are distributed fairly among all employees',
        parameters: { distributionType: 'equal' }
      }
    }
  ];

  private apiService = inject(ApiService);
  private messageService = inject(MessageService);

  ngOnInit(): void {
    this.loadRules();
  }

  loadRules(): void {
    this.loading = true;
    this.apiService.getRules().subscribe({
      next: (rules) => {
        this.rules = rules;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading rules:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load rules'
        });
        this.loading = false;
      }
    });
  }

  get activeRules(): Rule[] {
    return this.rules.filter(rule => rule.isActive);
  }

  openAddDialog(): void {
    this.selectedRule = null;
    this.isEditing = false;
    this.showDialog = true;
  }

  viewRule(rule: Rule): void {
    this.selectedRule = { ...rule };
    this.isEditing = false;
    this.formFields = this.formFields.map(field => ({ ...field, disabled: true }));
    this.showDialog = true;
  }

  editRule(rule: Rule): void {
    this.selectedRule = { ...rule };
    this.isEditing = true;
    this.formFields = this.formFields.map(field => ({ ...field, disabled: false }));
    this.showDialog = true;
  }

  useTemplate(template: any): void {
    this.selectedRule = { ...template.template };
    this.isEditing = false;
    this.showDialog = true;
  }

  saveRule(formData: any): void {
    this.formLoading = true;

    const ruleData = {
      ...formData,
      parameters: this.selectedRule?.parameters || {}
    };

    const operation = this.isEditing
      ? this.apiService.updateRule(this.selectedRule!._id!, ruleData)
      : this.apiService.createRule(ruleData);

    operation.subscribe({
      next: (rule) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Rule ${this.isEditing ? 'updated' : 'created'} successfully`
        });
        this.loadRules();
        this.closeDialog();
        this.formLoading = false;
      },
      error: (error) => {
        console.error('Error saving rule:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${this.isEditing ? 'update' : 'create'} rule`
        });
        this.formLoading = false;
      }
    });
  }

  toggleRuleStatus(rule: Rule, isActive: boolean): void {
    if (rule._id) {
      const operation = isActive
        ? this.apiService.activateRule(rule._id)
        : this.apiService.deactivateRule(rule._id);

      operation.subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Rule ${isActive ? 'activated' : 'deactivated'} successfully`
          });
          this.loadRules();
        },
        error: (error) => {
          console.error('Error toggling rule status:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to ${isActive ? 'activate' : 'deactivate'} rule`
          });
        }
      });
    }
  }

  deleteRule(rule: Rule): void {
    if (rule._id) {
      this.apiService.deleteRule(rule._id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Rule deleted successfully'
          });
          this.loadRules();
        },
        error: (error) => {
          console.error('Error deleting rule:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete rule'
          });
        }
      });
    }
  }

  closeDialog(): void {
    this.showDialog = false;
    this.selectedRule = null;
    this.formLoading = false;
    this.formFields = this.formFields.map(field => ({ ...field, disabled: false }));
  }

  get dialogTitle(): string {
    if (!this.showDialog) return '';
    if (this.isEditing) return 'Edit Rule';
    if (this.selectedRule && !this.isEditing) return 'View Rule';
    return 'Create New Rule';
  }
}
