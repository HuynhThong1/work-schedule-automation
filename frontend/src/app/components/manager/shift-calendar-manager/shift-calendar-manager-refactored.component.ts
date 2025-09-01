import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';

import { ApiService, Shift, ShiftRequest, ShiftRequestStatus, EmployeeType, Employee } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { CalendarService } from '../../../services/calendar.service';
import { DynamicCalendarComponent, CalendarEvent, CalendarConfig } from '../../shared/dynamic-calendar/dynamic-calendar.component';
import { CalendarHeaderComponent, HeaderAction } from '../../shared/calendar-header/calendar-header.component';
import { PopupComponent, PopupAction } from '../../shared/popup/popup.component';

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
    CardModule,
    ButtonModule,
    PopupComponent,
    TableModule,
    TagModule,
    ToastModule,

    BadgeModule,
    AvatarModule,
    AvatarGroupModule,
    CheckboxModule,
    FormsModule,
    DynamicCalendarComponent,
    CalendarHeaderComponent
  ],
  template: `
    <div class="manager-calendar-container">
      <p-toast></p-toast>

      <p-card>
        <!-- Calendar Header -->
        <app-calendar-header
          title="Manager Shift Calendar"
          subtitle="View shifts and employee registrations"
          headerIcon="pi pi-calendar"
          [actions]="headerActions"
          [showTimeNavigation]="true"
          (actionClick)="handleHeaderAction($event)"
          (timeNavigate)="handleTimeNavigation($event)">
        </app-calendar-header>

        <!-- Legend -->
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

        <!-- Dynamic Calendar -->
        <app-dynamic-calendar
          #dynamicCalendar
          [events]="calendarEvents"
          [config]="calendarConfig"
          [loading]="loading"
          (eventClick)="handleEventClick($event)"
          (dateSelect)="handleDateSelect($event)">
        </app-dynamic-calendar>
      </p-card>

      <!-- Shift Details Dialog -->
      <app-popup
        title="Shift Details"
        [visible]="showShiftDialog"
        width="800px"
        [modal]="true"
        [closable]="true"
        [draggable]="false"
        [resizable]="false"
        styleClass="shift-dialog"
        (closed)="closeShiftDialog()">

        <div *ngIf="selectedShift" class="shift-details">
          <div class="shift-info">
            <h3>{{ selectedShift.name }}</h3>
            <p><i class="pi pi-calendar"></i> {{ selectedShift.date | date:'fullDate' }}</p>
            <p><i class="pi pi-clock"></i> {{ selectedShift.startTime }} - {{ selectedShift.endTime }}</p>
            <p><i class="pi pi-users"></i> Capacity: {{ selectedShift.capacity }}</p>
          </div>

          <div class="shift-content">
            <div class="section">
              <h4>Assigned Employees ({{ selectedShift.assignedEmployees?.length || 0 }})</h4>
              <div class="employees-list" *ngIf="selectedShift.assignedEmployees?.length; else noAssigned">
                <div *ngFor="let employee of selectedShift.assignedEmployees" class="employee-item">
                  <p-avatar [label]="employee.name.charAt(0)" size="large"></p-avatar>
                  <div class="employee-info">
                    <span class="employee-name">{{ employee.name }}</span>
                    <span class="employee-code">{{ employee.code }}</span>
                    <p-tag [value]="employee.type" [severity]="getEmployeeTypeSeverity(employee.type)"></p-tag>
                  </div>
                </div>
              </div>
              <ng-template #noAssigned>
                <p class="no-data">No employees assigned to this shift.</p>
              </ng-template>
            </div>

            <div class="section">
              <h4>Pending Requests ({{ selectedShift.pendingRequests?.length || 0 }})</h4>
              <div class="requests-list" *ngIf="selectedShift.pendingRequests?.length; else noPending">
                <div *ngFor="let request of selectedShift.pendingRequests" class="request-item">
                  <p-avatar [label]="request.employee?.name?.charAt(0)" size="large"></p-avatar>
                  <div class="request-info">
                    <span class="employee-name">{{ request.employee?.name }}</span>
                    <span class="employee-code">{{ request.employee?.code }}</span>
                    <p-tag [value]="request.status" [severity]="getRequestStatusSeverity(request.status)"></p-tag>
                  </div>
                  <div class="request-actions">
                    <p-button
                      icon="pi pi-check"
                      severity="success"
                      size="small"
                      pTooltip="Approve"
                      (onClick)="approveRequest(request)">
                    </p-button>
                    <p-button
                      icon="pi pi-times"
                      severity="danger"
                      size="small"
                      pTooltip="Reject"
                      (onClick)="rejectRequest(request)">
                    </p-button>
                  </div>
                </div>
              </div>
              <ng-template #noPending>
                <p class="no-data">No pending requests for this shift.</p>
              </ng-template>
            </div>
          </div>
        </div>
      </app-popup>

      <!-- Auto Schedule Dialog -->
      <app-popup
        title="Auto Schedule"
        [visible]="showAutoScheduleDialogFlag"
        width="600px"
        [modal]="true"
        [closable]="true"
        [draggable]="false"
        [resizable]="false"
        [loading]="autoScheduleLoading"
        loadingText="Processing requests..."
        [actions]="autoScheduleActions"
        styleClass="auto-schedule-dialog"
        (closed)="closeAutoScheduleDialog()">

        <div class="auto-schedule-content">
          <p>This will automatically process pending shift requests based on:</p>
          <ul>
            <li>Employee availability</li>
            <li>Shift capacity limits</li>
            <li>Business rules and constraints</li>
            <li>Equal distribution preferences</li>
          </ul>
        </div>
      </app-popup>

      <!-- All Requests Dialog -->
      <app-popup
        title="All Shift Requests"
        [visible]="showAllRequestsDialog"
        width="1000px"
        [modal]="true"
        [closable]="true"
        [draggable]="false"
        [resizable]="false"
        styleClass="all-requests-dialog"
        (closed)="closeAllRequestsDialog()">

        <p-table [value]="allPendingRequests" [loading]="loading" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Employee</th>
              <th>Shift</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-request>
            <tr>
              <td>
                <div class="employee-cell">
                  <p-avatar [label]="request.employee?.name?.charAt(0)" size="normal"></p-avatar>
                  <div>
                    <div class="employee-name">{{ request.employee?.name }}</div>
                    <div class="employee-code">{{ request.employee?.code }}</div>
                  </div>
                </div>
              </td>
              <td>{{ request.shift?.name }}</td>
              <td>{{ request.shift?.date | date:'shortDate' }}</td>
              <td>{{ request.shift?.startTime }} - {{ request.shift?.endTime }}</td>
              <td>
                <p-tag [value]="request.status" [severity]="getRequestStatusSeverity(request.status)"></p-tag>
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-check"
                    severity="success"
                    size="small"
                    pTooltip="Approve"
                    (onClick)="approveRequest(request)">
                  </p-button>
                  <p-button
                    icon="pi pi-times"
                    severity="danger"
                    size="small"
                    pTooltip="Reject"
                    (onClick)="rejectRequest(request)">
                  </p-button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </app-popup>
    </div>
  `,
  styleUrls: ['./shift-calendar-manager-refactored.component.scss']
})
export class ShiftCalendarManagerRefactoredComponent implements OnInit {
  @ViewChild('dynamicCalendar') dynamicCalendar!: DynamicCalendarComponent;

  private apiService = inject(ApiService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private calendarService = inject(CalendarService);

  // Data properties
  shifts: ShiftWithRequests[] = [];
  allRequests: ShiftRequest[] = [];
  allPendingRequests: ShiftRequest[] = [];
  employees: Employee[] = [];

  // Calendar properties
  calendarEvents: CalendarEvent[] = [];
  calendarConfig: CalendarConfig;

  // Dialog properties
  showShiftDialog = false;
  showAutoScheduleDialogFlag = false;
  showAllRequestsDialog = false;
  selectedShift: ShiftWithRequests | null = null;

  // Loading states
  loading = false;
  autoScheduleLoading = false;

  // Header actions
  headerActions: HeaderAction[] = [
    {
      icon: 'pi pi-refresh',
      label: 'Refresh',
      severity: 'secondary',
      action: 'refresh'
    },
    {
      icon: 'pi pi-cog',
      label: 'Auto Schedule',
      severity: 'success',
      action: 'auto-schedule'
    },
    {
      icon: 'pi pi-users',
      label: 'All Requests',
      severity: 'info',
      action: 'all-requests'
    }
  ];

  // Auto schedule actions for popup
  autoScheduleActions: PopupAction[] = [
    {
      label: 'Cancel',
      severity: 'secondary',
      icon: 'pi pi-times',
      action: () => this.closeAutoScheduleDialog()
    },
    {
      label: 'Process Requests',
      severity: 'success',
      icon: 'pi pi-cog',
      loading: false,
      action: () => this.executeAutoScheduling()
    }
  ];

  constructor() {
    this.calendarConfig = this.calendarService.getCalendarConfig('manager');
  }

  get pendingRequestsCount(): number {
    return this.allPendingRequests.length;
  }

  ngOnInit(): void {
    this.loadData();
    this.updateHeaderActionsBadges();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      // Load shifts, requests, and employees in parallel
      const [shiftsResponse, requestsResponse, employeesResponse] = await Promise.all([
        firstValueFrom(this.apiService.getShifts()),
        firstValueFrom(this.apiService.getShiftRequests()),
        firstValueFrom(this.apiService.getEmployees())
      ]);

      this.shifts = shiftsResponse.map(shift => ({
        ...shift,
        requests: [],
        pendingRequests: [],
        approvedRequests: []
      }));

      this.allRequests = requestsResponse;
      this.employees = employeesResponse;

      // Group requests by shift
      this.groupRequestsByShift();

      // Filter pending requests
      this.allPendingRequests = this.allRequests.filter(req => req.status === ShiftRequestStatus.PENDING);

      // Update calendar events
      this.updateCalendarEvents();

      // Update header badges
      this.updateHeaderActionsBadges();

    } catch (error) {
      console.error('Error loading data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load calendar data'
      });
    } finally {
      this.loading = false;
    }
  }

  private groupRequestsByShift(): void {
    this.shifts.forEach(shift => {
      const shiftRequests = this.allRequests.filter(req => req.shiftId === shift._id);
      shift.requests = shiftRequests;
      shift.pendingRequests = shiftRequests.filter(req => req.status === ShiftRequestStatus.PENDING);
      shift.approvedRequests = shiftRequests.filter(req => req.status === ShiftRequestStatus.APPROVED);
    });
  }

  private updateCalendarEvents(): void {
    const shiftsForCalendar = this.shifts.map(shift => ({
      _id: shift._id,
      name: shift.name,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      capacity: shift.capacity,
      assignedEmployees: shift.assignedEmployees,
      manager: shift.manager,
      isPublished: shift.isPublished,
      description: shift.description,
      status: shift.status,
      pendingRequests: shift.pendingRequests || []
    }));
    this.calendarEvents = this.calendarService.convertShiftsToEvents(shiftsForCalendar, 'manager');
  }

  private updateHeaderActionsBadges(): void {
    const allRequestsAction = this.headerActions.find(action => action.action === 'all-requests');
    if (allRequestsAction) {
      allRequestsAction.badge = this.pendingRequestsCount > 0 ? this.pendingRequestsCount.toString() : undefined;
      allRequestsAction.badgeSeverity = 'danger';
    }
  }

  // Header action handlers
  handleHeaderAction(action: string): void {
    switch (action) {
      case 'refresh':
        this.loadData();
        break;
      case 'auto-schedule':
        this.showAutoScheduleDialog();
        break;
      case 'all-requests':
        this.showAllRequests();
        break;
    }
  }

  handleTimeNavigation(time: string): void {
    this.dynamicCalendar.scrollToTime(time);
  }

  // Calendar event handlers
  handleEventClick(eventInfo: any): void {
    const shiftId = eventInfo.event.id;
    const shift = this.shifts.find(s => s._id === shiftId);
    if (shift) {
      this.selectedShift = shift;
      this.showShiftDialog = true;
    }
  }

  handleDateSelect(selectInfo: any): void {
    // Handle date selection for creating new shifts (future feature)
    console.log('Date selected:', selectInfo);
  }

  // Dialog methods
  showAutoScheduleDialog(): void {
    this.showAutoScheduleDialogFlag = true;
  }

  closeAutoScheduleDialog(): void {
    this.showAutoScheduleDialogFlag = false;
  }

  showAllRequests(): void {
    this.showAllRequestsDialog = true;
  }

  closeShiftDialog(): void {
    // Always allow closing the dialog, but warn if there's an ongoing operation
    if (this.loading) {
      console.warn('Dialog closed while loading operation is in progress');
    }
    this.showShiftDialog = false;
    this.selectedShift = null;
  }

  closeAllRequestsDialog(): void {
    // Always allow closing the dialog, but warn if there's an ongoing operation
    if (this.loading) {
      console.warn('Dialog closed while loading operation is in progress');
    }
    this.showAllRequestsDialog = false;
  }

  // Auto scheduling
  async executeAutoScheduling(): Promise<void> {
    this.autoScheduleLoading = true;
    // Update button loading state
    this.autoScheduleActions[1].loading = true;

    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get visible shifts that have capacity
      const availableShifts = this.shifts.filter(shift => {
        const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
        return assignedCount < shift.capacity;
      });

      if (availableShifts.length === 0) {
        this.messageService.add({
          severity: 'info',
          summary: 'No Available Shifts',
          detail: 'All visible shifts are at full capacity.'
        });
        return;
      }

      const shiftIds = availableShifts.map(shift => shift._id).filter((id): id is string => !!id);
      const result = await firstValueFrom(this.apiService.autoProcessShiftRequests(shiftIds));

      this.messageService.add({
        severity: 'success',
        summary: 'Auto Scheduling Complete',
        detail: `Approved: ${result.approvedRequests}, Rejected: ${result.rejectedRequests}`
      });

      // Reload data to reflect changes
      await this.loadData();

    } catch (error) {
      console.error('Auto scheduling error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Auto Scheduling Failed',
        detail: 'Failed to process shift requests automatically'
      });
    } finally {
      this.autoScheduleLoading = false;
      // Reset button loading state
      this.autoScheduleActions[1].loading = false;
      this.closeAutoScheduleDialog();
    }
  }

  // Request management
  async approveRequest(request: ShiftRequest): Promise<void> {
    try {
      await firstValueFrom(this.apiService.updateShiftRequestStatus(request._id, ShiftRequestStatus.APPROVED));
      this.messageService.add({
        severity: 'success',
        summary: 'Request Approved',
        detail: `${request.employee?.name}'s request has been approved`
      });
      await this.loadData();
    } catch (error) {
      console.error('Error approving request:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to approve request'
      });
    }
  }

  async rejectRequest(request: ShiftRequest): Promise<void> {
    try {
      await firstValueFrom(this.apiService.updateShiftRequestStatus(request._id, ShiftRequestStatus.REJECTED));
      this.messageService.add({
        severity: 'success',
        summary: 'Request Rejected',
        detail: `${request.employee?.name}'s request has been rejected`
      });
      await this.loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to reject request'
      });
    }
  }

  // Utility methods
  getEmployeeTypeSeverity(type: EmployeeType): 'success' | 'info' | 'warning' | 'danger' {
    switch (type) {
      case EmployeeType.SENIOR: return 'success';
      case EmployeeType.JUNIOR: return 'info';
      case EmployeeType.NEW: return 'warning';
      default: return 'info';
    }
  }

  getRequestStatusSeverity(status: ShiftRequestStatus): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case ShiftRequestStatus.APPROVED: return 'success';
      case ShiftRequestStatus.REJECTED: return 'danger';
      case ShiftRequestStatus.PENDING: return 'warning';
      default: return 'info';
    }
  }
}
