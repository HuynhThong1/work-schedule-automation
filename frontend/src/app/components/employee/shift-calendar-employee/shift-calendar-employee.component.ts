import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';

import { ApiService, Shift, ShiftRequest, ShiftRequestStatus, EmployeeType, RequestType } from '../../../services/api.service';
import { AuthService, User } from '../../../services/auth.service';
import { CalendarService } from '../../../services/calendar.service';
import { DynamicCalendarComponent, CalendarEvent, CalendarConfig } from '../../shared/dynamic-calendar/dynamic-calendar.component';
import { CalendarHeaderComponent, HeaderAction } from '../../shared/calendar-header/calendar-header.component';

interface ShiftWithRequests extends Shift {
  requests: ShiftRequest[];
  pendingRequests: ShiftRequest[];
  approvedRequests: ShiftRequest[];
  canRequest?: boolean;
  userRequest?: ShiftRequest;
}

@Component({
  selector: 'app-shift-calendar-employee',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    TableModule,
    TagModule,
    ToastModule,
    TabsModule,
    BadgeModule,
    AvatarModule,
    DynamicCalendarComponent,
    CalendarHeaderComponent
  ],
  template: `
    <div class="employee-calendar-container">
      <p-toast></p-toast>

      <p-card>
        <!-- Calendar Header -->
        <app-calendar-header
          title="Employee Shift Calendar"
          subtitle="View available shifts and manage your requests"
          headerIcon="pi pi-calendar-plus"
          [actions]="headerActions"
          [showTimeNavigation]="true"
          (actionClick)="handleHeaderAction($event)"
          (timeNavigate)="handleTimeNavigation($event)">
        </app-calendar-header>

        <!-- Legend -->
        <div class="legend-container">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #10b981, #059669);"></div>
              <span class="legend-text">Available to Request</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #3b82f6, #2563eb);"></div>
              <span class="legend-text">Your Approved Shifts</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #f59e0b, #d97706);"></div>
              <span class="legend-text">Pending Request ⏳</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #ef4444, #dc2626);"></div>
              <span class="legend-text">Full / Unavailable 🔒</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: 2px solid #b91c1c; opacity: 0.8;"></div>
              <span class="legend-text">Request Rejected ❌</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: 2px dashed #b45309;"></div>
              <span class="legend-text">Your Shift Requests ⏰</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: 2px dashed #b91c1c; opacity: 0.6;"></div>
              <span class="legend-text">Rejected Requests ❌</span>
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
      <p-dialog
        header="Shift Details"
        [visible]="showShiftDialog"
        [modal]="true"
        [closable]="true"
        [closeOnEscape]="true"
        [dismissableMask]="true"
        [draggable]="false"
        [resizable]="false"
        styleClass="shift-dialog"
        (onHide)="closeShiftDialog()">

        <div *ngIf="selectedShift" class="shift-details">
          <div class="shift-info">
            <h3>{{ selectedShift.name }}</h3>
            <p><i class="pi pi-calendar"></i> {{ selectedShift.date | date:'fullDate' }}</p>
            <p><i class="pi pi-clock"></i> {{ selectedShift.startTime }} - {{ selectedShift.endTime }}</p>
            <p><i class="pi pi-users"></i> {{ getShiftCapacityText(selectedShift) }}</p>
            <p><i class="pi pi-info-circle"></i> {{ getShiftStatusText(selectedShift) }}</p>
          </div>

          <div class="shift-actions">
            <!-- Request Actions -->
            <div *ngIf="selectedShift.canRequest" class="request-section">
              <p class="section-title">Request this shift</p>
              <p class="section-description">You can request to work this shift. Your request will be reviewed by management.</p>
              <p-button
                label="Request Shift"
                icon="pi pi-plus"
                severity="success"
                [loading]="requestLoading"
                (onClick)="requestShift(selectedShift)">
              </p-button>
            </div>

            <!-- Pending Request -->
            <div *ngIf="selectedShift.userRequest?.status === ShiftRequestStatus.PENDING" class="pending-section">
              <p class="section-title">Request Pending</p>
              <p class="section-description">Your request for this shift is pending approval.</p>
              <p-button
                label="Cancel Request"
                icon="pi pi-times"
                severity="danger"
                [loading]="requestLoading"
                (onClick)="cancelRequest(selectedShift.userRequest!)">
              </p-button>
            </div>

            <!-- Approved Request -->
            <div *ngIf="selectedShift.userRequest?.status === ShiftRequestStatus.APPROVED" class="approved-section">
              <p class="section-title">You're Assigned!</p>
              <p class="section-description">You have been assigned to work this shift.</p>
              <p-tag value="ASSIGNED" severity="success" [style]="{'font-size': '1rem', 'padding': '0.5rem 1rem'}"></p-tag>
            </div>

            <!-- Cannot Request -->
            <div *ngIf="!selectedShift.canRequest && !selectedShift.userRequest" class="unavailable-section">
              <p class="section-title">Unavailable</p>
              <p class="section-description">{{ getUnavailableReason(selectedShift) }}</p>
            </div>
          </div>

          <!-- Other Assigned Employees -->
          <div class="assigned-employees">
            <p class="section-title">Assigned Employees ({{ selectedShift.assignedEmployees?.length || 0 }})</p>
            <div *ngIf="selectedShift.assignedEmployees?.length; else noEmployees" class="employees-list">
              <div *ngFor="let employee of selectedShift.assignedEmployees" class="employee-item">
                <p-avatar [label]="employee.name || ''" size="normal"></p-avatar>
                <div class="employee-info">
                  <span class="employee-name">{{ employee.name || '' }}</span>
                  <span class="employee-code">{{ employee.code || '' }}</span>
                  <p-tag [value]="employee.type || ''" [severity]="getEmployeeTypeSeverity(employee.type || '')"></p-tag>
                </div>
              </div>
            </div>
            <ng-template #noEmployees>
              <p class="no-employees">No employees assigned to this shift yet.</p>
            </ng-template>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button
            label="Close"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="closeShiftDialog()">
          </p-button>
        </ng-template>
      </p-dialog>

      <!-- My Requests Dialog -->
      <p-dialog
        header="My Shift Requests"
        [visible]="showMyRequestsDialog"
        [modal]="true"
        [closable]="true"
        [closeOnEscape]="true"
        [dismissableMask]="true"
        [draggable]="false"
        [resizable]="false"
        styleClass="my-requests-dialog"
        (onHide)="closeMyRequestsDialog()">

        <p-table [value]="myRequests" [loading]="loading" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Shift</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-request>
            <tr>
              <td>{{ request.shift?.name }}</td>
              <td>{{ request.shift?.date | date:'shortDate' }}</td>
              <td>{{ request.shift?.startTime }} - {{ request.shift?.endTime }}</td>
              <td>
                <p-tag [value]="request.status" [severity]="getRequestStatusSeverity(request.status)"></p-tag>
              </td>
              <td>
                <p-button
                  *ngIf="request.status === ShiftRequestStatus.PENDING"
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                  pTooltip="Cancel Request"
                  [loading]="requestLoading"
                  (onClick)="cancelRequest(request)">
                </p-button>
                <span *ngIf="request.status !== ShiftRequestStatus.PENDING" class="no-actions">-</span>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <ng-template pTemplate="footer">
          <p-button
            label="Close"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="closeMyRequestsDialog()">
          </p-button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styleUrls: ['./shift-calendar-employee.component.scss']
})
export class ShiftCalendarEmployeeComponent implements OnInit {
  @ViewChild('dynamicCalendar') dynamicCalendar!: DynamicCalendarComponent;

  // Make enums available in template
  readonly ShiftRequestStatus = ShiftRequestStatus;

  private apiService = inject(ApiService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private calendarService = inject(CalendarService);

  // Data properties
  shifts: ShiftWithRequests[] = [];
  myRequests: ShiftRequest[] = [];
  currentUser: User | null;

  // Calendar properties
  calendarEvents: CalendarEvent[] = [];
  calendarConfig: CalendarConfig;

  // Dialog properties
  showShiftDialog = false;
  showMyRequestsDialog = false;
  selectedShift: ShiftWithRequests | null = null;

  // Loading states
  loading = false;
  requestLoading = false;

  // Header actions
  headerActions: HeaderAction[] = [
    {
      icon: 'pi pi-refresh',
      label: 'Refresh',
      severity: 'secondary',
      action: 'refresh'
    },
    {
      icon: 'pi pi-list',
      label: 'My Requests',
      severity: 'info',
      action: 'my-requests'
    }
  ];

  constructor() {
    this.calendarConfig = this.calendarService.getCalendarConfig('employee');
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      // Handle case where user is not logged in
      console.error('User not logged in');
      return;
    }
  }

  get myPendingRequestsCount(): number {
    return this.myRequests.filter(req => req.status === ShiftRequestStatus.PENDING).length;
  }

  ngOnInit(): void {
    this.loadData();
    this.updateHeaderActionsBadges();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      // Load shifts and requests in parallel
      const [shiftsResponse, requestsResponse] = await Promise.all([
        firstValueFrom(this.apiService.getShifts()),
        firstValueFrom(this.apiService.getMyShiftRequests())
      ]);

      this.shifts = shiftsResponse.map(shift => ({
        ...shift,
        requests: [],
        pendingRequests: [],
        approvedRequests: [],
        canRequest: false,
        userRequest: undefined
      }));

      console.log('Loaded shifts with assigned employees:', this.shifts.map(s => ({
        id: s._id,
        name: s.name,
        assignedEmployees: s.assignedEmployees
      })));

      // Use the requests directly since getMyShiftRequests already filters for current user
      this.myRequests = requestsResponse;

      // If myRequests is empty but shifts have userRequest data, extract them
      if (this.myRequests.length === 0) {
        this.myRequests = this.shifts
          .filter(shift => shift.userRequest)
          .map(shift => ({
            ...shift.userRequest as ShiftRequest,
            shift: shift // Ensure shift data is included
          }));
        console.log('Extracted requests from shift data:', this.myRequests);
      } else {
        console.log('Using API requests:', this.myRequests);
      }

      // Process shifts for employee view
      this.processShiftsForEmployee();

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

  private processShiftsForEmployee(): void {
    if (!this.currentUser) return;

    this.shifts.forEach(shift => {
      // Find user's request for this shift - try both direct shiftId match and date/time match
      const userRequest = this.myRequests.find(req => {
        // Direct shift ID match
        if (req.shiftId === shift._id) {
          return true;
        }

        // Date and time match for requests without shiftId
        if (req.date && req.startTime && req.endTime) {
          const requestDate = new Date(req.date);
          const shiftDate = new Date(shift.date);
          const dateMatches = requestDate.toDateString() === shiftDate.toDateString();
          const timeMatches = req.startTime === shift.startTime && req.endTime === shift.endTime;
          return dateMatches && timeMatches;
        }

        return false;
      });

      shift.userRequest = userRequest;

      // Determine if user can request this shift
      shift.canRequest = this.currentUser ? this.calendarService.canInteractWithShift(shift, 'employee', this.currentUser.id) : false;

      // If user has a request for this shift, they can't request again
      if (userRequest && userRequest.status === ShiftRequestStatus.PENDING) {
        shift.canRequest = false;
      }
    });
  }

  private updateCalendarEvents(): void {
    // Start with shift-based events
    const shiftEvents = this.shifts.filter(shift => shift._id).map(shift => {
      const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
      const isUserAssigned = shift.assignedEmployees?.some(emp => emp._id === (this.currentUser?.id || ''));
      const userRequest = shift.userRequest;

      // Determine event styling based on user's relationship to the shift
      let className = 'fc-event-available';
      let title = `${shift.name}\n${shift.startTime} - ${shift.endTime}`;

      if (isUserAssigned || userRequest?.status === ShiftRequestStatus.APPROVED) {
        className = 'fc-event-assigned';
        title = `${shift.name} (Your Shift)\n${shift.startTime} - ${shift.endTime}`;
      } else if (userRequest?.status === ShiftRequestStatus.PENDING) {
        className = 'fc-event-pending';
        title = `${shift.name} (Pending Request)\n${shift.startTime} - ${shift.endTime}`;
      } else if (userRequest?.status === ShiftRequestStatus.REJECTED) {
        className = 'fc-event-rejected'; // Use special styling for rejected requests
        title = `${shift.name} (Request Rejected)\n${shift.startTime} - ${shift.endTime}`;
      } else if (assignedCount >= shift.capacity || !shift.canRequest) {
        className = 'fc-event-full';
        title = `${shift.name} (Full)\n${shift.startTime} - ${shift.endTime}`;
      }

      // Create proper datetime strings
      const shiftDate = new Date(shift.date);
      const dateStr = shiftDate.toISOString().split('T')[0];
      const startDateTime = `${dateStr}T${this.formatTime(shift.startTime)}`;
      let endDateTime = `${dateStr}T${this.formatTime(shift.endTime)}`;

      // Handle overnight shifts
      const startTime = shift.startTime.split(':').map(Number);
      const endTime = shift.endTime.split(':').map(Number);
      const startMinutes = startTime[0] * 60 + startTime[1];
      const endMinutes = endTime[0] * 60 + endTime[1];

      if (shift.endTime === '00:00' || endMinutes < startMinutes) {
        const nextDay = new Date(shiftDate);
        nextDay.setDate(nextDay.getDate() + 1);
        endDateTime = `${nextDay.toISOString().split('T')[0]}T${this.formatTime(shift.endTime)}`;
      }

      return {
        id: shift._id,
        title: title,
        start: startDateTime,
        end: endDateTime,
        className: className,
        allDay: false,
        extendedProps: {
          shift: shift,
          userRole: 'employee',
          type: 'shift'
        }
      };
    });

    // Add events for all shift requests, including those for existing shifts
    console.log('Creating request events from:', this.myRequests);

    const requestEvents = this.myRequests
      .map((req) => {
        console.log('Processing request:', req);

        let className = 'fc-event-request-pending';
        let title = '';
        let startDateTime = '';
        let endDateTime = '';

        if (req.status === ShiftRequestStatus.REJECTED) {
          className = 'fc-event-request-rejected';
        } else if (req.status === ShiftRequestStatus.APPROVED) {
          className = 'fc-event-request-approved';
        }

        // Handle requests for existing shifts
        if (req.shiftId && req.shift) {
          title = `${req.shift.name} Request`;
          if (req.status === ShiftRequestStatus.PENDING) {
            title += ' (Pending)';
          } else if (req.status === ShiftRequestStatus.REJECTED) {
            title += ' (Rejected)';
          } else if (req.status === ShiftRequestStatus.APPROVED) {
            title += ' (Approved)';
          }

          const shiftDate = new Date(req.shift.date);
          const dateStr = shiftDate.toISOString().split('T')[0];
          startDateTime = `${dateStr}T${this.formatTime(req.shift.startTime)}`;
          endDateTime = `${dateStr}T${this.formatTime(req.shift.endTime)}`;

          // Handle overnight shifts
          const startTime = req.shift.startTime.split(':').map(Number);
          const endTime = req.shift.endTime.split(':').map(Number);
          const startMinutes = startTime[0] * 60 + startTime[1];
          const endMinutes = endTime[0] * 60 + endTime[1];

          if (req.shift.endTime === '00:00' || endMinutes < startMinutes) {
            const nextDay = new Date(shiftDate);
            nextDay.setDate(nextDay.getDate() + 1);
            endDateTime = `${nextDay.toISOString().split('T')[0]}T${this.formatTime(req.shift.endTime)}`;
          }
        }
        // Handle direct shift requests (requests without an existing shift)
        else if (!req.shiftId && req.date && req.startTime && req.endTime) {
          title = `Requested Shift\n${req.startTime} - ${req.endTime}`;
          if (req.status === ShiftRequestStatus.REJECTED) {
            title = `Rejected Request\n${req.startTime} - ${req.endTime}`;
          }

          const requestDate = new Date(req.date as Date);
          const dateStr = requestDate.toISOString().split('T')[0];
          startDateTime = `${dateStr}T${this.formatTime(req.startTime as string)}`;
          endDateTime = `${dateStr}T${this.formatTime(req.endTime as string)}`;

          // Handle overnight requests
          const startTime = (req.startTime as string).split(':').map(Number);
          const endTime = (req.endTime as string).split(':').map(Number);
          const startMinutes = startTime[0] * 60 + startTime[1];
          const endMinutes = endTime[0] * 60 + endTime[1];

          if (req.endTime === '00:00' || endMinutes < startMinutes) {
            const nextDay = new Date(requestDate);
            nextDay.setDate(nextDay.getDate() + 1);
            endDateTime = `${nextDay.toISOString().split('T')[0]}T${this.formatTime(req.endTime as string)}`;
          }
        } else {
          // Skip requests that don't have enough information
          return null;
        }

        if (!startDateTime || !endDateTime || !title) {
          console.log('Skipping request due to missing data:', { startDateTime, endDateTime, title });
          return null;
        }

        const event = {
          id: `request-${req._id}`,
          title: title,
          start: new Date(startDateTime),
          end: new Date(endDateTime),
          className: className,
          allDay: false,
          extendedProps: {
            request: req,
            userRole: 'employee',
            type: 'request'
          }
        };

        console.log('Created request event:', event);
        return event;
      })
      .filter(event => event !== null); // Remove null events

    // Combine all events
    this.calendarEvents = [...shiftEvents, ...requestEvents];
    console.log('Final calendar events:', this.calendarEvents);
    console.log('Events count - Shifts:', shiftEvents.length, 'Requests:', requestEvents.length);

    // Verify event structure
    if (requestEvents.length > 0) {
      console.log('Sample request event structure:', requestEvents[0]);
      console.log('Event has required properties:', {
        id: !!requestEvents[0].id,
        title: !!requestEvents[0].title,
        start: !!requestEvents[0].start,
        end: !!requestEvents[0].end
      });
    }
  }

  private formatTime(time: string): string {
    const parts = time.split(':');
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    return time;
  }

  private updateHeaderActionsBadges(): void {
    const myRequestsAction = this.headerActions.find(action => action.action === 'my-requests');
    if (myRequestsAction) {
      myRequestsAction.badge = this.myPendingRequestsCount > 0 ? this.myPendingRequestsCount.toString() : undefined;
      myRequestsAction.badgeSeverity = 'warn';
    }
  }

  // Header action handlers
  handleHeaderAction(action: string): void {
    switch (action) {
      case 'refresh':
        this.loadData();
        break;
      case 'my-requests':
        this.showMyRequests();
        break;
    }
  }

  handleTimeNavigation(time: string): void {
    this.dynamicCalendar.scrollToTime(time);
  }

  // Calendar event handlers
  handleEventClick(eventInfo: { event: { id: string; extendedProps: { type?: string; shift?: ShiftWithRequests; request?: ShiftRequest } } }): void {
    const eventId = eventInfo.event.id;
    const extendedProps = eventInfo.event.extendedProps;

    if (extendedProps.type === 'shift') {
      // Handle shift click
      const shift = this.shifts.find(s => s._id === eventId);
      if (shift) {
        console.log('Selected shift for dialog:', {
          id: shift._id,
          name: shift.name,
          assignedEmployees: shift.assignedEmployees,
          assignedEmployeesLength: shift.assignedEmployees?.length
        });
        this.selectedShift = shift;
        this.showShiftDialog = true;
      }
    } else if (extendedProps.type === 'request') {
      // Handle direct request click - show in My Requests dialog
      this.showMyRequests();
    }
  }

  handleDateSelect(selectInfo: { start: Date; end: Date; allDay: boolean }): void {
    // Handle date selection (future feature for requesting custom shifts)
    console.log('Date selected:', selectInfo);
  }

  // Dialog methods
  showMyRequests(): void {
    this.showMyRequestsDialog = true;
  }

  closeShiftDialog(): void {
    // Always allow closing the dialog, but warn if there's an ongoing operation
    if (this.requestLoading) {
      console.warn('Dialog closed while request is in progress');
    }
    this.showShiftDialog = false;
    this.selectedShift = null;
    this.requestLoading = false; // Reset loading state when closing
  }

  closeMyRequestsDialog(): void {
    // Always allow closing the dialog, but warn if there's an ongoing operation
    if (this.requestLoading) {
      console.warn('Dialog closed while request is in progress');
    }
    this.showMyRequestsDialog = false;
    this.requestLoading = false; // Reset loading state when closing
  }

  // Request management
  async requestShift(shift: ShiftWithRequests): Promise<void> {
    if (!this.currentUser) return;

    this.requestLoading = true;
    try {
      await firstValueFrom(this.apiService.createShiftRequest({
        shiftId: shift._id,
        employeeId: this.currentUser.id,
        type: RequestType.REQUEST
      }));

      this.messageService.add({
        severity: 'success',
        summary: 'Request Submitted',
        detail: `Your request for ${shift.name} has been submitted`
      });

      await this.loadData();
      this.closeShiftDialog();

    } catch (error) {
      console.error('Error requesting shift:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Request Failed',
        detail: 'Failed to submit shift request'
      });
    } finally {
      this.requestLoading = false;
    }
  }

  async cancelRequest(request: ShiftRequest): Promise<void> {
    this.requestLoading = true;
    try {
      if (!request._id) {
        throw new Error('Request ID is required');
      }
      await firstValueFrom(this.apiService.deleteShiftRequest(request._id));

      this.messageService.add({
        severity: 'success',
        summary: 'Request Cancelled',
        detail: 'Your shift request has been cancelled'
      });

      await this.loadData();
      if (this.showShiftDialog) {
        this.closeShiftDialog();
      }

    } catch (error) {
      console.error('Error cancelling request:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Cancellation Failed',
        detail: 'Failed to cancel shift request'
      });
    } finally {
      this.requestLoading = false;
    }
  }

  // Utility methods
  getShiftCapacityText(shift: ShiftWithRequests): string {
    const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
    return `${assignedCount}/${shift.capacity} assigned`;
  }

  getShiftStatusText(shift: ShiftWithRequests): string {
    if (shift.userRequest?.status === ShiftRequestStatus.APPROVED) {
      return 'You are assigned to this shift';
    } else if (shift.userRequest?.status === ShiftRequestStatus.PENDING) {
      return 'Your request is pending approval';
    } else if (shift.canRequest) {
      return 'Available for request';
    } else {
      return this.getUnavailableReason(shift);
    }
  }

  getUnavailableReason(shift: ShiftWithRequests): string {
    const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;

    if (assignedCount >= shift.capacity) {
      return 'This shift is at full capacity';
    }

    if (shift.userRequest) {
      return `You already have a ${shift.userRequest.status.toLowerCase()} request for this shift`;
    }

    return 'This shift is not available for requests';
  }

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
