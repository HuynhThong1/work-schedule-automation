import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';

import { ApiService, Shift, ShiftRequest } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { firstValueFrom } from 'rxjs';

interface ShiftWithRequests extends Shift {
  requests: ShiftRequest[];
  pendingRequests: ShiftRequest[];
  approvedRequests: ShiftRequest[];
}

@Component({
  selector: 'app-shift-calendar-manager',
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule,
    ToastModule,
    CardModule,
    ButtonModule,
    DialogModule,
    TabsModule,
    BadgeModule,
    AvatarModule,
    AvatarGroupModule,
    CheckboxModule,
    FormsModule,
  ],
  providers: [MessageService],
  template: `
    <div class="p-6">
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4 bg-blue-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i class="pi pi-calendar text-3xl text-blue-600 mr-3"></i>
                <div>
                  <h2 class="text-2xl font-bold text-gray-900">Manager Shift Calendar</h2>
                  <p class="text-gray-600">View shifts and employee registrations</p>
                </div>
              </div>
              <div class="flex gap-3">
                <p-button
                  icon="pi pi-refresh"
                  label="Refresh"
                  severity="secondary"
                  styleClass="action-button"
                  [loading]="loading"
                  (onClick)="loadData()">
                </p-button>
                <p-button
                  icon="pi pi-cog"
                  label="Auto Schedule"
                  severity="success"
                  styleClass="action-button"
                  [disabled]="loading"
                  (onClick)="showAutoScheduleDialog()">
                </p-button>
                <p-button
                  icon="pi pi-users"
                  label="All Requests"
                  severity="help"
                  styleClass="action-button"
                  (onClick)="showAllRequests()"
                  [badge]="pendingRequestsCount > 0 ? pendingRequestsCount.toString() : ''"
                  badgeSeverity="danger">
                </p-button>
              </div>
            </div>
          </div>
        </ng-template>

        <div class="legend-container">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #10b981, #059669);"></div>
              <span class="legend-text">Available Shifts</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #3b82f6, #2563eb);"></div>
              <span class="legend-text">With Assignments</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #f59e0b, #d97706);"></div>
              <span class="legend-text">Pending Requests ⏳</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #ef4444, #dc2626);"></div>
              <span class="legend-text">Full Capacity 🔒</span>
            </div>
          </div>
        </div>

        <div class="calendar-container relative">
          <full-calendar
            [options]="calendarOptions">
          </full-calendar>

          <!-- Loading Overlay -->
          <div *ngIf="loading" class="loading-overlay">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </p-card>

      <!-- Shift Details Dialog -->
      <p-dialog
        [header]="selectedShift ? 'Shift Details - ' + (selectedShift.date | date:'shortDate') + ' ' + selectedShift.startTime + '-' + selectedShift.endTime : 'Shift Details'"
        [modal]="true"
        [visible]="showShiftDialog"
        [style]="{ width: '700px' }"
        [closable]="!loading"
        [dismissableMask]="!loading"
        (onHide)="closeShiftDialog()">

        <div *ngIf="selectedShift" class="space-y-6">
          <!-- Shift Info -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="font-semibold text-lg mb-2">{{ selectedShift.name || 'Shift Details' }}</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium">Date:</span>
                {{ selectedShift.date | date:'fullDate' }}
              </div>
              <div>
                <span class="font-medium">Time:</span>
                {{ selectedShift.startTime }} - {{ selectedShift.endTime }}
              </div>
              <div>
                <span class="font-medium">Capacity:</span>
                {{ selectedShift.assignedEmployees ? selectedShift.assignedEmployees.length : 0 }} / {{ selectedShift.capacity }}
              </div>
              <div>
                <span class="font-medium">Status:</span>
                <span [class]="getStatusClass(selectedShift)">
                  {{ getShiftStatus(selectedShift) }}
                </span>
              </div>
            </div>
          </div>

          <p-tabs value="0">
            <p-tablist>
              <p-tab value="0">
                <i class="pi pi-users mr-2"></i>
                Assigned Employees
                <p-badge
                  *ngIf="selectedShift.assignedEmployees && selectedShift.assignedEmployees.length"
                  [value]="selectedShift.assignedEmployees.length.toString()"
                  severity="success"
                  class="ml-2">
                </p-badge>
              </p-tab>
              <p-tab value="1">
                <i class="pi pi-clock mr-2"></i>
                Pending Requests
                <p-badge
                  *ngIf="getShiftPendingRequests(selectedShift).length"
                  [value]="getShiftPendingRequests(selectedShift).length.toString()"
                  severity="warn"
                  class="ml-2">
                </p-badge>
              </p-tab>
              <p-tab value="2">
                <i class="pi pi-check mr-2"></i>
                All Requests
                <p-badge
                  *ngIf="getShiftAllRequests(selectedShift).length"
                  [value]="getShiftAllRequests(selectedShift).length.toString()"
                  severity="info"
                  class="ml-2">
                </p-badge>
              </p-tab>
            </p-tablist>
            <p-tabpanels>
              <!-- Assigned Employees -->
              <p-tabpanel value="0">
                <div class="space-y-3">
                  <div *ngFor="let employee of getAssignedEmployees(selectedShift)"
                       class="flex items-center justify-between p-3 border rounded-lg">
                    <div class="flex items-center gap-3">
                      <p-avatar
                        [label]="getEmployeeInitials(employee)"
                        shape="circle"
                        size="large"
                        styleClass="bg-blue-500 text-white">
                      </p-avatar>
                      <div>
                        <h4 class="font-semibold">{{ employee.name }}</h4>
                        <p class="text-sm text-gray-600">{{ employee.code }} • {{ employee.type | titlecase }}</p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <p-button
                        icon="pi pi-times"
                        severity="danger"
                        size="small"
                        (onClick)="unassignEmployee(selectedShift, employee._id!)"
                        [disabled]="loading"
                        [loading]="loading">
                      </p-button>
                    </div>
                  </div>

                  <div *ngIf="!selectedShift.assignedEmployees || !selectedShift.assignedEmployees.length"
                       class="text-center py-8 text-gray-500">
                    <i class="pi pi-users text-3xl mb-2"></i>
                    <p>No employees assigned to this shift</p>
                  </div>
                </div>
              </p-tabpanel>

              <!-- Pending Requests -->
              <p-tabpanel value="1">
                <div class="space-y-3">
                  <div *ngFor="let request of getShiftPendingRequests(selectedShift)"
                       class="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50">
                    <div class="flex items-center gap-3">
                      <p-avatar
                        [label]="getEmployeeInitials(request.employeeId)"
                        shape="circle"
                        size="large"
                        styleClass="bg-orange-500 text-white">
                      </p-avatar>
                      <div>
                        <h4 class="font-semibold">{{ getEmployeeName(request.employeeId) }}</h4>
                        <p class="text-sm text-gray-600">{{ getEmployeeCode(request.employeeId) }}</p>
                        <p *ngIf="request.reason" class="text-sm text-gray-500 mt-1">{{ request.reason }}</p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <p-button
                        icon="pi pi-check"
                        label="Approve"
                        severity="success"
                        size="small"
                        (onClick)="approveRequest(request)"
                        [disabled]="loading"
                        [loading]="loading">
                      </p-button>
                      <p-button
                        icon="pi pi-times"
                        label="Reject"
                        severity="danger"
                        size="small"
                        (onClick)="rejectRequest(request)"
                        [disabled]="loading"
                        [loading]="loading">
                      </p-button>
                    </div>
                  </div>

                  <div *ngIf="!getShiftPendingRequests(selectedShift).length"
                       class="text-center py-8 text-gray-500">
                    <i class="pi pi-clock text-3xl mb-2"></i>
                    <p>No pending requests for this shift</p>
                  </div>
                </div>
              </p-tabpanel>

              <!-- All Requests -->
              <p-tabpanel value="2">
                <div class="space-y-3">
                  <div *ngFor="let request of getShiftAllRequests(selectedShift)"
                       class="flex items-center justify-between p-3 border rounded-lg"
                       [ngClass]="{
                         'border-green-200 bg-green-50': request.status === 'approved',
                         'border-red-200 bg-red-50': request.status === 'rejected',
                         'border-orange-200 bg-orange-50': request.status === 'pending'
                       }">
                    <div class="flex items-center gap-3">
                      <p-avatar
                        [label]="getEmployeeInitials(request.employeeId)"
                        shape="circle"
                        size="large"
                        [styleClass]="getRequestAvatarClass(request.status)">
                      </p-avatar>
                      <div>
                        <h4 class="font-semibold">{{ getEmployeeName(request.employeeId) }}</h4>
                        <p class="text-sm text-gray-600">{{ getEmployeeCode(request.employeeId) }}</p>
                        <p *ngIf="request.reason" class="text-sm text-gray-500 mt-1">{{ request.reason }}</p>
                        <p *ngIf="request.reviewNotes" class="text-sm text-blue-600 mt-1">
                          <i class="pi pi-comment mr-1"></i>{{ request.reviewNotes }}
                        </p>
                      </div>
                    </div>
                    <div class="text-right">
                      <span class="px-3 py-1 rounded-full text-sm font-medium"
                            [ngClass]="{
                              'bg-yellow-100 text-yellow-800': request.status === 'pending',
                              'bg-green-100 text-green-800': request.status === 'approved',
                              'bg-red-100 text-red-800': request.status === 'rejected'
                            }">
                        {{ request.status | titlecase }}
                      </span>
                      <p class="text-xs text-gray-500 mt-1">
                        {{ request.createdAt | date:'short' }}
                      </p>
                    </div>
                  </div>

                  <div *ngIf="!getShiftAllRequests(selectedShift).length"
                       class="text-center py-8 text-gray-500">
                    <i class="pi pi-list text-3xl mb-2"></i>
                    <p>No requests found for this shift</p>
                  </div>
                </div>
              </p-tabpanel>
            </p-tabpanels>
          </p-tabs>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <p-button
              label="Close"
              severity="secondary"
              (onClick)="closeShiftDialog()"
              [disabled]="loading">
            </p-button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- All Requests Dialog -->
      <p-dialog
        header="All Pending Shift Requests"
        [modal]="true"
        [visible]="showAllRequestsDialog"
        [style]="{ width: '900px' }"
        [closable]="!loading"
        [dismissableMask]="!loading"
        (onHide)="closeAllRequestsDialog()">

        <div class="space-y-4">
          <div *ngFor="let request of allPendingRequests"
               class="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50">
            <div class="flex items-center gap-4">
              <p-avatar
                [label]="getEmployeeInitials(request.employeeId)"
                shape="circle"
                size="large"
                styleClass="bg-orange-500 text-white">
              </p-avatar>
              <div>
                <h4 class="font-semibold">{{ getEmployeeName(request.employeeId) }}</h4>
                <p class="text-sm text-gray-600">{{ getEmployeeCode(request.employeeId) }}</p>
                <div class="flex items-center gap-4 mt-1 text-sm">
                  <span><i class="pi pi-calendar mr-1"></i>{{ request.date | date:'shortDate' }}</span>
                  <span><i class="pi pi-clock mr-1"></i>{{ request.startTime }} - {{ request.endTime }}</span>
                </div>
                <p *ngIf="request.reason" class="text-sm text-gray-500 mt-1">{{ request.reason }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <p-button
                icon="pi pi-check"
                label="Approve"
                severity="success"
                size="small"
                (onClick)="approveRequest(request)"
                [disabled]="loading"
                [loading]="loading">
              </p-button>
              <p-button
                icon="pi pi-times"
                label="Reject"
                severity="danger"
                size="small"
                (onClick)="rejectRequest(request)"
                [disabled]="loading"
                [loading]="loading">
              </p-button>
            </div>
          </div>

                    <div *ngIf="!allPendingRequests.length"
               class="text-center py-8 text-gray-500">
            <i class="pi pi-check-circle text-3xl mb-2"></i>
            <p>No pending requests found</p>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <p-button
              label="Close"
              severity="secondary"
              (onClick)="closeAllRequestsDialog()"
              [disabled]="loading">
            </p-button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Auto Schedule Dialog -->
      <p-dialog
        header="Automatic Scheduling"
        [modal]="true"
        [visible]="showAutoScheduleDialogFlag"
        [style]="{ width: '500px' }"
        [closable]="!autoScheduleLoading"
        [dismissableMask]="!autoScheduleLoading"
        (onHide)="closeAutoScheduleDialog()">

        <div class="space-y-4">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-900 mb-2">
              <i class="pi pi-info-circle mr-2"></i>Auto-Scheduling Features
            </h4>
            <ul class="text-sm text-blue-800 space-y-1">
              <li>• Processes pending shift requests automatically</li>
              <li>• Approves/rejects based on availability and capacity</li>
              <li>• Ensures equal distribution across all staff</li>
              <li>• Pairs NEW employees with JUNIOR employees for mentoring</li>
              <li>• Respects business rules and weekly hour limits</li>
            </ul>
          </div>

          <div class="bg-green-50 p-3 rounded border-l-4 border-green-400">
            <div class="flex">
              <i class="pi pi-info-circle text-green-600 mr-2 mt-0.5"></i>
              <div class="text-sm">
                <p class="font-medium text-green-800">How it works:</p>
                <p class="text-green-700">The system will review all pending shift requests for the visible shifts and automatically approve or reject them based on employee availability, shift capacity, equal distribution rules, and mentoring requirements.</p>
              </div>
            </div>
          </div>

          <div class="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
            <div class="flex">
              <i class="pi pi-exclamation-triangle text-yellow-600 mr-2 mt-0.5"></i>
              <div class="text-sm">
                <p class="font-medium text-yellow-800">Important:</p>
                <p class="text-yellow-700">This will process all pending shift requests for shifts in the current calendar view. Requests will be automatically approved or rejected based on availability, capacity, and business rules.</p>
              </div>
            </div>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <p-button
              label="Cancel"
              severity="secondary"
              (onClick)="closeAutoScheduleDialog()"
              [disabled]="autoScheduleLoading">
            </p-button>
            <p-button
              icon="pi pi-check-circle"
              label="Process Shift Requests"
              severity="primary"
              (onClick)="executeAutoScheduling()"
              [disabled]="autoScheduleLoading"
              [loading]="autoScheduleLoading">
            </p-button>
          </div>
        </ng-template>
      </p-dialog>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .calendar-container {
      height: auto;
      max-height: 700px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      overflow: auto;
    }

    /* FullCalendar Base Styling */
    :host ::ng-deep .fc {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
    }

    /* Header Styling */
    :host ::ng-deep .fc-header-toolbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1.5rem 2rem;
      margin-bottom: 0;
      border-radius: 0;
    }

    :host ::ng-deep .fc-toolbar-title {
      color: #ffffff;
      font-size: 1.75rem;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    :host ::ng-deep .fc-button-group .fc-button {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-weight: 500;
      transition: all 0.3s ease;
      margin: 0 2px;
    }

    :host ::ng-deep .fc-button-group .fc-button:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    :host ::ng-deep .fc-button-group .fc-button:focus {
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
    }

    :host ::ng-deep .fc-button-active {
      background: rgba(255, 255, 255, 0.4) !important;
      border-color: rgba(255, 255, 255, 0.6) !important;
    }

    /* Calendar Grid */
    :host ::ng-deep .fc-scrollgrid {
      border: none;
    }

    :host ::ng-deep .fc-col-header {
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
    }

    :host ::ng-deep .fc-col-header-cell {
      padding: 1rem 0.5rem;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    :host ::ng-deep .fc-timegrid-slot {
      border-color: #f1f5f9;
      height: 3rem;
    }

    :host ::ng-deep .fc-timegrid-slot-label {
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 500;
      padding-right: 1rem;
    }

    :host ::ng-deep .fc-timegrid-axis {
      background: #fafbfc;
      border-right: 2px solid #e2e8f0;
    }

    /* Day Columns */
    :host ::ng-deep .fc-day {
      background: #ffffff;
      transition: background-color 0.2s ease;
    }

    :host ::ng-deep .fc-day:hover {
      background: #f8fafc;
    }

    :host ::ng-deep .fc-day-today {
      background: #fef3c7 !important;
      position: relative;
    }

    :host ::ng-deep .fc-day-today::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }

    /* Google Calendar-style Event Styling */
    :host ::ng-deep .fc-event {
      cursor: pointer;
      border-radius: 4px;
      border: none !important;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 2px 6px;
      margin: 0 1px;
      transition: all 0.2s ease;
      box-shadow: none;
      position: relative;
      overflow: hidden;
      /* Critical: Remove all height constraints for proper spanning */
      min-height: 0 !important;
      height: auto !important;
      max-height: none !important;
    }

    /* Time grid events - key to Google Calendar-style spanning */
    :host ::ng-deep .fc-timegrid-event {
      /* Remove all height constraints */
      min-height: 0 !important;
      height: calc(100% - 10px) !important;
      max-height: none !important;
      /* Ensure proper positioning */
      left: 0 !important;
      right: 0 !important;
      margin-left: 1px !important;
      margin-right: 1px !important;
    }

    /* Event content container */
    :host ::ng-deep .fc-timegrid-event .fc-event-main {
      height: 100% !important;
      padding: 2px 4px !important;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
    }

    /* Event title styling - Google Calendar style */
    :host ::ng-deep .fc-event-title {
      font-size: 0.75rem !important;
      line-height: 1.2 !important;
      font-weight: 500 !important;
      color: white !important;
      width: 100%;
      /* Allow multi-line text like Google Calendar */
      white-space: pre-line !important;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    /* Hide time display since we include it in title */
    :host ::ng-deep .fc-event-time {
      display: none !important;
    }

    /* Ensure proper event harness */
    :host ::ng-deep .fc-timegrid-event-harness {
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
    }

    /* Remove resizer handles */
    :host ::ng-deep .fc-event-resizer {
      display: none !important;
    }

    /* Ensure proper time slot rendering */
    :host ::ng-deep .fc-timegrid-slot {
      height: 3rem !important; /* Fixed height for each hour slot */
      border-bottom: 1px solid #e5e7eb;
    }

    :host ::ng-deep .fc-timegrid-slot-minor {
      border-bottom: 1px solid #f3f4f6;
    }

    /* Ensure events fill the time slots properly */
    :host ::ng-deep .fc-timegrid-col-events {
      margin: 0 !important;
    }

    :host ::ng-deep .fc-event:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      z-index: 10;
    }

    :host ::ng-deep .fc-event::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.3);
    }

    /* Available Shifts - Green */
    :host ::ng-deep .fc-event-available {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #ffffff;
      border-left: 4px solid #047857;
    }

    :host ::ng-deep .fc-event-available:hover {
      background: linear-gradient(135deg, #059669, #047857);
    }

    /* Assigned Shifts - Blue */
    :host ::ng-deep .fc-event-assigned {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #ffffff;
      border-left: 4px solid #1d4ed8;
    }

    :host ::ng-deep .fc-event-assigned:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
    }

    /* Pending Requests - Orange */
    :host ::ng-deep .fc-event-pending {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #ffffff;
      border-left: 4px solid #b45309;
    }

    :host ::ng-deep .fc-event-pending:hover {
      background: linear-gradient(135deg, #d97706, #b45309);
    }

    :host ::ng-deep .fc-event-pending::after {
      content: '⏳';
      position: absolute;
      top: 2px;
      right: 4px;
      font-size: 0.7rem;
    }

    /* Full Capacity - Red */
    :host ::ng-deep .fc-event-full {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #ffffff;
      border-left: 4px solid #b91c1c;
    }

    :host ::ng-deep .fc-event-full:hover {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
    }

    :host ::ng-deep .fc-event-full::after {
      content: '🔒';
      position: absolute;
      top: 2px;
      right: 4px;
      font-size: 0.7rem;
    }

    /* Event Title Styling */
    :host ::ng-deep .fc-event-title {
      font-weight: 600;
      line-height: 1.2;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    /* Legend Improvements */
    .legend-container {
      background: #f8fafc;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid #e2e8f0;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .legend-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: #475569;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .calendar-container {
        height: 500px;
      }

      :host ::ng-deep .fc-header-toolbar {
        padding: 1rem;
        flex-direction: column;
        gap: 1rem;
      }

      :host ::ng-deep .fc-toolbar-title {
        font-size: 1.25rem;
      }

      :host ::ng-deep .fc-button-group .fc-button {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
      }

      :host ::ng-deep .fc-event {
        font-size: 0.7rem;
        padding: 0.125rem 0.375rem;
      }
    }

    /* Dialog Improvements */
    :host ::ng-deep .p-tabview .p-tabview-panels {
      padding: 1rem 0;
    }

    :host ::ng-deep .p-dialog .p-dialog-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      border-radius: 12px 12px 0 0;
    }

    :host ::ng-deep .p-dialog .p-dialog-content {
      border-radius: 0 0 12px 12px;
    }

    /* Loading States */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      z-index: 1000;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Header Card Styling */
    :host ::ng-deep .p-card .p-card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      border-radius: 12px 12px 0 0;
      border: none;
    }

    :host ::ng-deep .p-card .p-card-body {
      padding: 0;
      border-radius: 0 0 12px 12px;
    }

    :host ::ng-deep .p-card .p-card-content {
      padding: 1.5rem;
    }

    /* Button Styling */
    :host ::ng-deep .action-button {
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    :host ::ng-deep .action-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    :host ::ng-deep .action-button:focus {
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
    }

    /* Badge Styling */
    :host ::ng-deep .p-badge {
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.7rem;
      min-width: 1.2rem;
      height: 1.2rem;
      line-height: 1.2rem;
    }

    /* Toast Styling */
    :host ::ng-deep .p-toast .p-toast-message {
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    :host ::ng-deep .p-toast .p-toast-message-success {
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
    }

    :host ::ng-deep .p-toast .p-toast-message-error {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border: none;
    }

    :host ::ng-deep .p-toast .p-toast-message-warn {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border: none;
    }

    :host ::ng-deep .p-toast .p-toast-message-info {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      border: none;
    }
  `]
})
export class ShiftCalendarManagerComponent implements OnInit {
  private apiService = inject(ApiService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  calendarOptions: CalendarOptions = {
    initialView: 'timeGridWeek',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    editable: false,
    selectable: false,
    dayMaxEvents: true,
    weekends: true,
    eventClick: this.handleEventClick.bind(this),
    height: 'auto',
    slotMinTime: '06:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: '01:00:00',
    slotLabelInterval: '01:00:00', // Show every hour like Google Calendar
    allDaySlot: false,
    nowIndicator: true,
    scrollTime: '08:00:00',
    // Key settings for proper time spanning like Google Calendar
    eventDisplay: 'block',
    displayEventTime: false, // Hide time text to match Google Calendar style
    displayEventEnd: false,
    eventMinHeight: 0, // Allow events to be as small as needed
    expandRows: true,
    stickyHeaderDates: true,
    dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric' },
    slotLabelFormat: {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    },
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    },
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // Monday - Sunday
      startTime: '08:00',
      endTime: '23:00'
    },
    // Ensure proper event positioning and spanning
    eventOverlap: true,
    slotEventOverlap: false,
    snapDuration: '00:15:00' // 15-minute precision like Google Calendar
  };

  shifts: ShiftWithRequests[] = [];
  allRequests: ShiftRequest[] = [];
  allPendingRequests: ShiftRequest[] = [];
  employees: any[] = [];

  selectedShift: ShiftWithRequests | null = null;
  showShiftDialog = false;
  showAllRequestsDialog = false;
    showAutoScheduleDialogFlag = false;
  loading = false;
  autoScheduleLoading = false;

  get pendingRequestsCount(): number {
    return this.allPendingRequests.length;
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      // Load shifts, requests, and employees in parallel
      const [shifts, requests, employees] = await Promise.all([
        firstValueFrom(this.apiService.getShifts()),
        firstValueFrom(this.apiService.getShiftRequests()),
        firstValueFrom(this.apiService.getEmployees())
      ]);

      this.shifts = shifts.map(shift => ({
        ...shift,
        requests: requests.filter(req =>
          req.shiftId === shift._id ||
          (req.date && req.startTime && req.endTime &&
           new Date(req.date).toDateString() === new Date(shift.date).toDateString() &&
           req.startTime === shift.startTime && req.endTime === shift.endTime)
        ),
        pendingRequests: requests.filter(req =>
          req.status === 'pending' && (
            req.shiftId === shift._id ||
            (req.date && req.startTime && req.endTime &&
             new Date(req.date).toDateString() === new Date(shift.date).toDateString() &&
             req.startTime === shift.startTime && req.endTime === shift.endTime)
          )
        ),
        approvedRequests: requests.filter(req =>
          req.status === 'approved' && (
            req.shiftId === shift._id ||
            (req.date && req.startTime && req.endTime &&
             new Date(req.date).toDateString() === new Date(shift.date).toDateString() &&
             req.startTime === shift.startTime && req.endTime === shift.endTime)
          )
        )
      }));

      this.allRequests = requests;
      this.allPendingRequests = requests.filter(req => req.status === 'pending');
      this.employees = employees;

      this.updateCalendarEvents();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load data'
      });
    } finally {
      this.loading = false;
    }
  }

  updateCalendarEvents(): void {
    const events = this.shifts.map(shift => {
      let className = 'fc-event-available';
      // Google Calendar style: Show time range and shift name
      let title = `${shift.name}\n${shift.startTime} - ${shift.endTime}`;

      const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
      const pendingCount = shift.pendingRequests ? shift.pendingRequests.length : 0;

      if (assignedCount >= shift.capacity) {
        className = 'fc-event-full';
        title = `${shift.name} (Full)\n${shift.startTime} - ${shift.endTime}\n${assignedCount}/${shift.capacity} assigned`;
      } else if (assignedCount > 0) {
        className = 'fc-event-assigned';
        title = `${shift.name}\n${shift.startTime} - ${shift.endTime}\n${assignedCount}/${shift.capacity} assigned`;
      }

      if (pendingCount > 0) {
        className = 'fc-event-pending';
        title = `${shift.name}\n${shift.startTime} - ${shift.endTime}\n${pendingCount} pending requests`;
      }

            // Create proper Date objects for the shift
      const shiftDate = new Date(shift.date);

      // Parse start and end times
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      // Create start datetime
      const startDateTime = new Date(shiftDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      // Create end datetime
      const endDateTime = new Date(shiftDate);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      // Handle overnight shifts (e.g., 18:00-00:00)
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (shift.endTime === '00:00' || endMinutes < startMinutes) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }


      return {
        id: shift._id,
        title: title,
        start: startDateTime, // Now using Date object
        end: endDateTime, // Now using Date object
        className: className,
        allDay: false, // Ensure it's treated as a timed event
        display: 'auto', // Ensure proper display mode
        extendedProps: {
          shift: shift,
          assignedEmployees: shift.assignedEmployees,
          pendingRequests: shift.pendingRequests
        }
      };
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };
  }

  handleEventClick(clickInfo: EventClickArg): void {
    this.selectedShift = clickInfo.event.extendedProps['shift'] as ShiftWithRequests;
    this.showShiftDialog = true;
  }

  getShiftStatus(shift: Shift): string {
    const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
    if (assignedCount >= shift.capacity) return 'Full';
    if (assignedCount > 0) return 'Partially Filled';
    return 'Available';
  }

  getStatusClass(shift: Shift): string {
    const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
    if (assignedCount >= shift.capacity) return 'px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs';
    if (assignedCount > 0) return 'px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs';
    return 'px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs';
  }

  getShiftPendingRequests(shift: ShiftWithRequests): ShiftRequest[] {
    return shift.pendingRequests || [];
  }

  getShiftAllRequests(shift: ShiftWithRequests): ShiftRequest[] {
    return shift.requests || [];
  }

  getAssignedEmployees(shift: Shift): any[] {
    if (!shift.assignedEmployees || !shift.assignedEmployees.length) return [];
    return this.employees.filter(emp => shift.assignedEmployees.includes(emp._id));
  }

  getEmployeeName(employeeId: any): string {
    if (typeof employeeId === 'object' && employeeId.name) return employeeId.name;
    const employee = this.employees.find(emp => emp._id === employeeId);
    return employee?.name || 'Unknown Employee';
  }

  getEmployeeCode(employeeId: any): string {
    if (typeof employeeId === 'object' && employeeId.code) return employeeId.code;
    const employee = this.employees.find(emp => emp._id === employeeId);
    return employee?.code || 'N/A';
  }

  getEmployeeInitials(employeeId: any): string {
    const name = this.getEmployeeName(employeeId);
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getRequestAvatarClass(status: string): string {
    switch (status) {
      case 'approved': return 'bg-green-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      default: return 'bg-orange-500 text-white';
    }
  }

    async approveRequest(request: ShiftRequest): Promise<void> {
    if (!request._id) return;

    this.loading = true;
    try {
      await firstValueFrom(this.apiService.approveShiftRequest(request._id));
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Shift request approved'
      });

      // Reload data and update selected shift
      await this.loadData();
      await this.refreshSelectedShift();

    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to approve request'
      });
    } finally {
      this.loading = false;
    }
  }

    async rejectRequest(request: ShiftRequest): Promise<void> {
    if (!request._id) return;

    this.loading = true;
    try {
      await firstValueFrom(this.apiService.rejectShiftRequest(request._id));
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Shift request rejected'
      });

      // Reload data and update selected shift
      await this.loadData();
      await this.refreshSelectedShift();

    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to reject request'
      });
    } finally {
      this.loading = false;
    }
  }

    async unassignEmployee(shift: Shift, employeeId: string): Promise<void> {
    if (!shift._id) return;

    this.loading = true;
    try {
      // Assuming there's an unassign endpoint - we might need to add this to the API service
      await firstValueFrom(this.apiService.updateShift(shift._id, {
        assignedEmployees: shift.assignedEmployees.filter(id => id !== employeeId)
      }));

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Employee unassigned from shift'
      });

      // Reload data and update selected shift
      await this.loadData();
      await this.refreshSelectedShift();

    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to unassign employee'
      });
    } finally {
      this.loading = false;
    }
  }

  // Method to refresh the selected shift data after operations
  private async refreshSelectedShift(): Promise<void> {
    if (this.selectedShift && this.selectedShift._id) {
      // Find the updated shift in the loaded data
      const updatedShift = this.shifts.find(s => s._id === this.selectedShift!._id);
      if (updatedShift) {
        this.selectedShift = updatedShift;
      }
    }
  }

  showAllRequests(): void {
    this.showAllRequestsDialog = true;
  }

  closeShiftDialog(): void {
    if (!this.loading) {
      this.showShiftDialog = false;
      this.selectedShift = null;
    }
  }

  closeAllRequestsDialog(): void {
    if (!this.loading) {
      this.showAllRequestsDialog = false;
    }
  }

  showAutoScheduleDialog(): void {
    this.showAutoScheduleDialogFlag = true;
  }

  closeAutoScheduleDialog(): void {
    if (!this.autoScheduleLoading) {
      this.showAutoScheduleDialogFlag = false;
    }
  }

    async executeAutoScheduling(): Promise<void> {
    this.autoScheduleLoading = true;
    try {
      // Get the current calendar view date range
      const calendarApi = (document.querySelector('full-calendar') as any)?.getApi?.();
      let startDate = new Date();
      let endDate = new Date();

      if (calendarApi) {
        const view = calendarApi.view;
        startDate = view.activeStart;
        endDate = view.activeEnd;
      } else {
        // Fallback: use current week
        startDate = new Date();
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // End of week
      }

      // Get shifts in the current view that are not at full capacity
      const visibleShifts = this.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        const isInDateRange = shiftDate >= startDate && shiftDate <= endDate;
        const hasCapacity = (shift.assignedEmployees?.length || 0) < shift.capacity;
        return isInDateRange && hasCapacity;
      });

      if (visibleShifts.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Shifts Available',
          detail: 'No shifts with available capacity found in the current calendar view.'
        });
        return;
      }

      // Get shift IDs for the API call
      const shiftIds = visibleShifts.map(shift => shift._id!).filter(id => id);

      if (shiftIds.length === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid Shifts',
          detail: 'No valid shift IDs found. Please refresh and try again.'
        });
        return;
      }

      // Call the new auto-process API that handles shift requests
      const result = await firstValueFrom(
        this.apiService.autoProcessShiftRequests(shiftIds)
      );

      if (result.approvedRequests === 0 && result.rejectedRequests === 0) {
        this.messageService.add({
          severity: 'info',
          summary: 'No Requests to Process',
          detail: 'No pending shift requests found for the selected shifts.'
        });
      } else {
        this.messageService.add({
          severity: 'success',
          summary: 'Auto-Processing Complete',
          detail: `Processed ${result.approvedRequests + result.rejectedRequests} shift requests: ${result.approvedRequests} approved, ${result.rejectedRequests} rejected. Equal distribution and mentoring rules applied.`
        });
      }

      // Reload the calendar data to show the new assignments
      await this.loadData();
      this.closeAutoScheduleDialog();

    } catch (error: any) {
      console.error('Auto-scheduling error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Auto-Scheduling Failed',
        detail: error.response?.data?.message || error.message || 'Failed to auto-assign employees to shifts. Please try again.'
      });
    } finally {
      this.autoScheduleLoading = false;
    }
  }
}
