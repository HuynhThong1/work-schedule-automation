import { Component, Input, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule, ButtonSeverity } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';

export interface TableColumn {
  field: string;
  header: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'tag' | 'actions';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  tagSeverity?: (value: any) => 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';
  tagValue?: (value: any) => string;
  format?: (value: any) => string;
}

export interface TableAction {
  icon: string;
  label: string;
  severity?: ButtonSeverity;
  action: (item: any) => void;
  visible?: (item: any) => boolean;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    InputTextModule
  ],
  providers: [ConfirmationService],
  template: `
    <p-table
      [value]="data"
      [columns]="columns"
      [paginator]="paginator"
      [rows]="rows"
      [showCurrentPageReport]="true"
      [loading]="loading"
      [globalFilterFields]="getFilterFields()"
      #dt
      styleClass="p-datatable-gridlines">

      <ng-template pTemplate="caption">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold">{{ title }}</h3>
          <div class="flex gap-2">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input
                pInputText
                type="text"
                (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                placeholder="Search..." />
            </span>
            <p-button
              *ngIf="showAddButton"
              icon="pi pi-plus"
              label="Add New"
              (onClick)="add.emit()"
              severity="success">
            </p-button>
          </div>
        </div>
      </ng-template>

      <ng-template pTemplate="header" let-columns>
        <tr>
          <th *ngFor="let col of columns" [pSortableColumn]="col.sortable ? col.field : null" [style.width]="col.width">
            {{ col.header }}
            <p-sortIcon *ngIf="col.sortable" [field]="col.field"></p-sortIcon>
          </th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-item let-columns="columns">
        <tr>
          <td *ngFor="let col of columns">
            <ng-container [ngSwitch]="col.type">
              <!-- Text -->
              <span *ngSwitchCase="'text'">{{ getValue(item, col.field) }}</span>

              <!-- Number -->
              <span *ngSwitchCase="'number'">{{ getValue(item, col.field) | number }}</span>

              <!-- Currency -->
              <span *ngSwitchCase="'currency'">{{ getValue(item, col.field) | currency:'USD':'symbol':'1.2-2' }}</span>

              <!-- Date -->
              <span *ngSwitchCase="'date'">{{ getValue(item, col.field) | date:'short' }}</span>

              <!-- Boolean -->
              <p-tag
                *ngSwitchCase="'boolean'"
                [value]="getValue(item, col.field) ? 'Active' : 'Inactive'"
                [severity]="getValue(item, col.field) ? 'success' : 'danger'">
              </p-tag>

              <!-- Tag -->
              <p-tag
                *ngSwitchCase="'tag'"
                [value]="col.tagValue ? col.tagValue(getValue(item, col.field)) : getValue(item, col.field)"
                [severity]="col.tagSeverity ? col.tagSeverity(getValue(item, col.field)) : 'info'">
              </p-tag>

              <!-- Actions -->
              <div *ngSwitchCase="'actions'" class="flex gap-1">
                <p-button
                  *ngFor="let action of actions"
                  [icon]="action.icon"
                  [pTooltip]="action.label"
                  [severity]="action.severity || 'secondary'"
                  size="small"
                  [style.display]="action.visible && !action.visible(item) ? 'none' : 'inline-flex'"
                  (onClick)="action.action(item)">
                </p-button>
              </div>

              <!-- Default -->
              <span *ngSwitchDefault>
                {{ col.format ? col.format(getValue(item, col.field)) : getValue(item, col.field) }}
              </span>
            </ng-container>
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td [attr.colspan]="columns.length" class="text-center py-8">
            <div class="text-gray-500">
              <i class="pi pi-info-circle text-3xl mb-2"></i>
              <p>No {{ title.toLowerCase() }} found</p>
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  styles: [`
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background-color: #f8fafc;
      border-color: #e2e8f0;
      font-weight: 600;
    }

    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background-color: #f1f5f9;
    }
  `]
})
export class DataTableComponent {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() actions: TableAction[] = [];
  @Input() title = 'Data';
  @Input() loading = false;
  @Input() paginator = true;
  @Input() rows = 10;
  @Input() showAddButton = true;

  add = output<void>();

  private confirmationService = inject(ConfirmationService);


  getValue(item: any, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key], item);
  }

  getFilterFields(): string[] {
    return this.columns
      .filter(col => col.filterable !== false && col.type !== 'actions')
      .map(col => col.field);
  }

  confirmDelete(item: any, deleteAction: () => void): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this item?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteAction()
    });
  }
}
