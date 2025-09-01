import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService, RequestType, Shift, ShiftRequest } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { firstValueFrom } from 'rxjs';

// Remove local interface since we're importing from API service

// Extended props carried on FullCalendar events for this view
interface EventExtendedProps {
  shift: Shift;
  assignedEmployees: Array<{ _id?: string; name?: string; code?: string } | string>;
  pendingRequests: ShiftRequest[];
  isUserAssigned: boolean;
  userHasPendingRequest: boolean;
}

@Component({
  selector: 'app-shift-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule,
    ToastModule,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    SelectModule,
    ReactiveFormsModule
  ],
  providers: [MessageService],
  template: `
    <div class="p-6">
      <p-card>
        <ng-template pTemplate="header">
          <div class="p-4 bg-green-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i class="pi pi-calendar text-3xl text-green-600 mr-3"></i>
                <div>
                  <h2 class="text-2xl font-bold text-gray-900">Shift Calendar</h2>
                  <p class="text-gray-600">View available shifts and register for your preferred time slots</p>
                </div>
              </div>
              <div class="flex gap-2">
                <p-button
                  icon="pi pi-refresh"
                  label="Refresh"
                  severity="secondary"
                  (onClick)="loadShifts()">
                </p-button>
                <p-button
                  icon="pi pi-clock"
                  label="My Requests"
                  severity="info"
                  (onClick)="showMyRequests()">
                </p-button>
              </div>
            </div>
          </div>
        </ng-template>

        <div class="calendar-container">
          <full-calendar
            [options]="calendarOptions">
          </full-calendar>
        </div>
      </p-card>

      <!-- Shift Registration Dialog -->
      <p-dialog
        header="Register for Shift"
        [modal]="true"
        [visible]="showRegistrationDialog"
        [style]="{ width: '500px' }"
        (onHide)="closeRegistrationDialog()">

        <form [formGroup]="registrationForm" (ngSubmit)="submitShiftRequest()">
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="date" class="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <p-datepicker
                formControlName="date"
                [showIcon]="true"
                [disabled]="true"
                styleClass="w-full">
              </p-datepicker>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="startTime" class="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  formControlName="startTime"
                  class="w-full p-2 border border-gray-300 rounded-md">
              </div>
              <div>
                <label for="endTime" class="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  formControlName="endTime"
                  class="w-full p-2 border border-gray-300 rounded-md">
              </div>
            </div>

            <div>
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <p-textarea
                formControlName="notes"
                rows="3"
                placeholder="Any additional notes or preferences..."
                styleClass="w-full">
              </p-textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <p-button
              type="button"
              label="Cancel"
              severity="secondary"
              (onClick)="closeRegistrationDialog()">
            </p-button>
            <p-button
              type="submit"
              label="Submit Request"
              severity="success"
              [disabled]="registrationForm.invalid || submitting"
              [loading]="submitting">
            </p-button>
          </div>
        </form>
      </p-dialog>

      <!-- My Requests Dialog -->
      <p-dialog
        header="My Shift Requests"
        [modal]="true"
        [visible]="showRequestsDialog"
        [style]="{ width: '800px' }"
        (onHide)="closeRequestsDialog()">

        <div class="space-y-4">
          <div *ngFor="let request of myRequests" class="border rounded-lg p-4">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold text-lg">{{ request.date | date:'fullDate' }}</h4>
                <p class="text-gray-600">{{ request.startTime }} - {{ request.endTime }}</p>
                <p *ngIf="request.reason" class="text-sm text-gray-500 mt-1">{{ request.reason }}</p>
              </div>
              <div class="text-right">
                <span
                  class="px-3 py-1 rounded-full text-sm font-medium"
                  [ngClass]="{
                    'bg-yellow-100 text-yellow-800': request.status === 'pending',
                    'bg-green-100 text-green-800': request.status === 'approved',
                    'bg-red-100 text-red-800': request.status === 'rejected'
                  }">
                  {{ request.status | titlecase }}
                </span>
                <p-button
                  *ngIf="request.status === 'pending'"
                  icon="pi pi-trash"
                  severity="danger"
                  size="small"
                  class="ml-2"
                  (onClick)="cancelRequest(request._id!)">
                </p-button>
              </div>
            </div>
          </div>

          <div *ngIf="myRequests.length === 0" class="text-center py-8 text-gray-500">
            <i class="pi pi-info-circle text-3xl mb-2"></i>
            <p>No shift requests found</p>
          </div>
        </div>
      </p-dialog>

      <!-- Shift Details Dialog -->
      <p-dialog
        [header]="shiftDetailsData?.summary || 'Shift Details'"
        [modal]="true"
        [visible]="showShiftDetailsDialog"
        [style]="{ width: '600px' }"
        [draggable]="false"
        [closable]="true"
        [dismissableMask]="true"
        (onHide)="closeShiftDetailsDialog()"
        >

        <div *ngIf="shiftDetailsData" class="space-y-4">
          <!-- Shift Basic Info -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              <i class="pi pi-clock mr-2"></i>
              {{ shiftDetailsData.shift.name || 'Shift' }}
            </h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">Date:</span>
                <span class="ml-2">{{ shiftDetailsData.shift.date | date:'fullDate' }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Time:</span>
                <span class="ml-2">{{ shiftDetailsData.shift.startTime }} - {{ shiftDetailsData.shift.endTime }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Capacity:</span>
                <span class="ml-2">{{ shiftDetailsData.assignedEmployees.length }}/{{ shiftDetailsData.shift.capacity }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Status:</span>
                                <span class="ml-2"
                      [ngClass]="{
                        'text-green-600 font-medium': shiftDetailsData.isUserAssigned || (!shiftDetailsData.isUserAssigned && !shiftDetailsData.userHasPendingRequest && shiftDetailsData.assignedEmployees.length < shiftDetailsData.shift.capacity),
                        'text-blue-600 font-medium': shiftDetailsData.userHasPendingRequest,
                        'text-red-600 font-medium': shiftDetailsData.assignedEmployees.length >= shiftDetailsData.shift.capacity && !shiftDetailsData.isUserAssigned
                      }">
                  {{ shiftDetailsData.statusMessage }}
                </span>
              </div>
            </div>
          </div>

          <!-- Assigned Employees -->
          <div *ngIf="shiftDetailsData.assignedEmployees.length > 0" class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-semibold text-green-800 mb-3">
              <i class="pi pi-check-circle mr-2"></i>
              Assigned Employees ({{ shiftDetailsData.assignedEmployees.length }})
            </h4>
            <div class="grid grid-cols-1 gap-2">
              <div *ngFor="let emp of shiftDetailsData.assignedEmployees"
                   class="flex items-center bg-white p-2 rounded border">
                <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span class="text-green-700 font-medium text-sm">{{ getEmployeeInitials(emp) }}</span>
                </div>
                <div>
                  <span class="font-medium">{{ emp.name }}</span>
                  <span class="text-gray-500 ml-2">({{ emp.code }})</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pending Applications -->
          <div *ngIf="shiftDetailsData.pendingRequests.length > 0" class="bg-yellow-50 p-4 rounded-lg">
            <h4 class="font-semibold text-yellow-800 mb-3">
              <i class="pi pi-clock mr-2"></i>
              Pending Applications ({{ shiftDetailsData.pendingRequests.length }})
            </h4>
            <div class="grid grid-cols-1 gap-2">
              <div *ngFor="let req of shiftDetailsData.pendingRequests"
                   class="flex items-center bg-white p-2 rounded border">
                <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <span class="text-yellow-700 font-medium text-sm">{{ getEmployeeInitials(req.employeeId) }}</span>
                </div>
                <div>
                  <span class="font-medium">{{ getEmployeeName(req.employeeId) }}</span>
                  <span class="text-gray-500 text-sm ml-2">Applied</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-2 pt-4 border-t">
            <p-button
              label="Close"
              severity="secondary"
              (onClick)="closeShiftDetailsDialog()">
            </p-button>
            <p-button
              *ngIf="!shiftDetailsData.isUserAssigned && !shiftDetailsData.userHasPendingRequest && shiftDetailsData.assignedEmployees.length < shiftDetailsData.shift.capacity"
              label="Apply for Shift"
              severity="success"
              icon="pi pi-plus"
              (onClick)="applyForShiftFromDetails()">
            </p-button>
          </div>
        </div>
      </p-dialog>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .calendar-container {
      height: 600px;
    }

    :host ::ng-deep .fc {
      font-family: inherit;
    }

    :host ::ng-deep .fc-event {
      cursor: pointer;
    }

    :host ::ng-deep .fc-event-available {
      background-color: #10b981;
      border-color: #059669;
    }

    :host ::ng-deep .fc-event-assigned {
      background-color: #3b82f6;
      border-color: #2563eb;
    }

    :host ::ng-deep .fc-event-requested {
      background-color: #f59e0b;
      border-color: #d97706;
    }

    :host ::ng-deep .fc-event-pending {
      background-color: #f59e0b;
      border-color: #d97706;
    }

    :host ::ng-deep .fc-event-full {
      background-color: #ef4444;
      border-color: #dc2626;
    }

    :host ::ng-deep .fc-event-title {
      font-weight: 600;
      font-size: 12px;
    }

    :host ::ng-deep .fc-event {
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      position: relative;
    }

    :host ::ng-deep .fc-event:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    :host ::ng-deep .p-toast .p-toast-message {
      max-width: 500px;
    }

    :host ::ng-deep .p-toast .p-toast-message .p-toast-message-content {
      padding: 16px;
    }

    /* Event decorations: pending badge and my-request dot */
    :host ::ng-deep .fc-event .event-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background-color: #f59e0b;
      color: #ffffff;
      border-radius: 9999px;
      padding: 0 6px;
      line-height: 16px;
      height: 16px;
      font-size: 10px;
      font-weight: 700;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
      pointer-events: none;
    }

    :host ::ng-deep .fc-event .event-dot {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 8px;
      height: 8px;
      border-radius: 9999px;
      background-color: #2563eb;
      border: 1px solid #ffffff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
      pointer-events: none;
    }
  `]
})
export class ShiftCalendarComponent implements OnInit {
  calendarOptions: CalendarOptions = {
    initialView: 'timeGridWeek',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    editable: false,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventsSet: this.handleEvents.bind(this),
    eventContent: this.renderEventContent.bind(this),
    height: 'auto'
  };

  shifts: Shift[] = [];
  myRequests: ShiftRequest[] = [];
  allRequests: ShiftRequest[] = [];
  employees: any[] = [];
  showRegistrationDialog = false;
  showRequestsDialog = false;
  showShiftDetailsDialog = false;
  submitting = false;
  selectedDate: Date | null = null;
  selectedShift: Shift | null = null;
  shiftDetailsData: any = null;

  registrationForm: FormGroup;

  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  constructor() {
    this.registrationForm = this.fb.group({
      date: [null, Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    try {
      // Load shifts, requests, and employees in parallel
      const [shifts, myRequests, allRequests, employees] = await Promise.all([
        firstValueFrom(this.apiService.getShifts()),
        firstValueFrom(this.apiService.getMyShiftRequests()),
        firstValueFrom(this.apiService.getShiftRequests()),
        firstValueFrom(this.apiService.getEmployeesBasicInfo())
      ]);

      this.shifts = shifts;
      this.myRequests = myRequests;
      this.allRequests = allRequests;
      this.employees = employees;

      this.updateCalendarEvents();
    } catch (error) {
      console.error('Error loading data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load calendar data'
      });
    }
  }

  loadShifts(): void {
    this.loadAllData();
  }

  loadMyRequests(): void {
    this.loadAllData();
  }

  updateCalendarEvents(): void {
    console.log('Updating calendar events');
    console.log('Shifts:', this.shifts.length);
    console.log('All requests:', this.allRequests.length);
    console.log('My requests:', this.myRequests.length);

    const events = this.shifts.map(shift => {
      const currentUser = this.authService.getCurrentUser();
      let className = 'fc-event-available';
      let title = shift.name || 'Shift';

      // Get assigned employees for this shift
      const assignedEmployees = this.getAssignedEmployees(shift);
      const assignedCount = assignedEmployees.length;

      // Get pending requests for this shift
      const pendingRequests = this.getShiftRequests(shift, 'pending');
      const pendingCount = pendingRequests.length;

      console.log(`Shift ${shift._id} on ${shift.date}: ${pendingCount} pending requests`, pendingRequests);

      // Check if current user is assigned
      const isUserAssigned = this.isUserAssignedToShift(shift, currentUser?.id || '');

      // Check if current user has pending request
      const userHasPendingRequest = pendingRequests.some(req => {
        const reqEmployeeId = typeof req.employeeId === 'object' ? (req.employeeId as any)._id : req.employeeId;
        return reqEmployeeId === currentUser?.id;
      });

      console.log(`User ${currentUser?.id} pending request for shift ${shift._id}:`, userHasPendingRequest);

      if (isUserAssigned) {
        className = 'fc-event-assigned';
        title = `${title} (Your Shift)`;
      } else if (userHasPendingRequest) {
        className = 'fc-event-requested';
        title = `${title} (Requested - Pending Approval)`;
      } else if (assignedCount >= shift.capacity) {
        className = 'fc-event-full';
        title = `${title} (Full: ${assignedCount}/${shift.capacity})`;
      } else if (pendingCount > 0) {
        className = 'fc-event-pending';
        title = `${title} (${assignedCount}/${shift.capacity})`;
      } else {
        title = `${title} (${assignedCount}/${shift.capacity})`;
      }

      // Add applicants info to title
      if (pendingCount > 0) {
        title += ` [${pendingCount} applied]`;
      }

      // Add assigned employee names to title (show first few names)
      if (assignedCount > 0) {
        const employeeNames = assignedEmployees.slice(0, 2).map(emp => emp.name.split(' ')[0]).join(', ');
        if (assignedCount > 2) {
          title += `\n👥 ${employeeNames} +${assignedCount - 2} more`;
        } else {
          title += `\n👥 ${employeeNames}`;
        }
      }

      // Handle overnight shifts (e.g., 18:00-00:00)
      const shiftDate = new Date(shift.date);
      const dateStr = shiftDate.toISOString().split('T')[0];
      const startDateTime = dateStr + 'T' + shift.startTime;
      let endDateTime = dateStr + 'T' + shift.endTime;

      // If end time is 00:00 or if end time is before start time, add one day to end date
      const startTime = shift.startTime.split(':').map(Number);
      const endTime = shift.endTime.split(':').map(Number);
      const startMinutes = startTime[0] * 60 + startTime[1];
      const endMinutes = endTime[0] * 60 + endTime[1];

      if (shift.endTime === '00:00' || endMinutes < startMinutes) {
        const nextDay = new Date(shiftDate);
        nextDay.setDate(nextDay.getDate() + 1);
        endDateTime = nextDay.toISOString().split('T')[0] + 'T' + shift.endTime;
      }

      return {
        id: shift._id,
        title: title,
        start: startDateTime,
        end: endDateTime,
        className: className,
        extendedProps: {
          shift: shift,
          assignedEmployees: assignedEmployees,
          pendingRequests: pendingRequests,
          isUserAssigned: isUserAssigned,
          userHasPendingRequest: userHasPendingRequest
        }
      };
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };
  }

  // Custom render to add badges/dots for requests
  renderEventContent(arg: EventContentArg) {
    const nodes: HTMLElement[] = [];
    const wrapper = document.createElement('div');
    wrapper.className = 'event-main';

    const titleEl = document.createElement('div');
    titleEl.className = 'event-title';
    titleEl.textContent = (arg.event.title || '').split('\n')[0];
    wrapper.appendChild(titleEl);

    const ext = arg.event.extendedProps as unknown as Partial<EventExtendedProps>;
    const pending = (ext?.pendingRequests as ShiftRequest[] | undefined) ?? [];
    const userHasPending = !!ext?.userHasPendingRequest;

    if (pending && pending.length > 0) {
      const badge = document.createElement('span');
      badge.className = 'event-badge';
      badge.title = `${pending.length} pending request${pending.length > 1 ? 's' : ''}`;
      badge.textContent = String(pending.length);
      wrapper.appendChild(badge);
    }

    if (userHasPending) {
      const dot = document.createElement('span');
      dot.className = 'event-dot';
      dot.title = 'You requested this shift';
      wrapper.appendChild(dot);
    }

    nodes.push(wrapper);
    return { domNodes: nodes };
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    this.selectedDate = selectInfo.start;
    this.registrationForm.patchValue({
      date: selectInfo.start,
      startTime: selectInfo.start.toTimeString().slice(0, 5),
      endTime: selectInfo.end.toTimeString().slice(0, 5)
    });
    this.showRegistrationDialog = true;
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const shift = clickInfo.event.extendedProps['shift'] as Shift;
    const assignedEmployees = clickInfo.event.extendedProps['assignedEmployees'] || [];
    const pendingRequests = clickInfo.event.extendedProps['pendingRequests'] || [];
    const isUserAssigned = clickInfo.event.extendedProps['isUserAssigned'] || false;
    const userHasPendingRequest = clickInfo.event.extendedProps['userHasPendingRequest'] || false;

    // Show shift details
    this.showShiftDetails(shift, assignedEmployees, pendingRequests, isUserAssigned, userHasPendingRequest);
  }

  handleEvents(): void {
    // Handle events if needed
  }

  submitShiftRequest(): void {
    if (this.registrationForm.valid) {
      // Double-check that user doesn't already have a pending request for this shift
      if (this.selectedShift) {
        const currentUser = this.authService.getCurrentUser();
        const existingRequest = this.allRequests.find(req =>
          req.employeeId === currentUser?.id &&
          req.shiftId === this.selectedShift?._id &&
          req.status === 'pending'
        );

        if (existingRequest) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Already Applied',
            detail: 'You have already applied for this shift. Please wait for approval.',
            life: 5000
          });
          this.closeRegistrationDialog();
          return;
        }
      }

      this.submitting = true;
      const formData = this.registrationForm.value;
      const currentUser = this.authService.getCurrentUser();

      const shiftRequest: Partial<ShiftRequest> = {
        employeeId: currentUser?.id || '',
        type: RequestType.PICKUP,
        shiftId: this.selectedShift?._id, // Include shiftId if available
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        reason: formData.notes
      };

      this.apiService.createShiftRequest(shiftRequest).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Shift request submitted successfully'
          });
          this.submitting = false;
          this.closeRegistrationDialog();
          this.loadAllData();
        },
        error: (error) => {
          console.error('Error submitting shift request:', error);
          let errorMessage = 'Failed to submit shift request';

          // Handle specific error messages
          if (error.error?.message) {
            if (error.error.message.includes('already a pending request')) {
              errorMessage = 'You have already applied for this shift. Please wait for approval.';
            } else if (error.error.message.includes('full capacity')) {
              errorMessage = 'This shift is now at full capacity.';
            } else {
              errorMessage = error.error.message;
            }
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Application Failed',
            detail: errorMessage,
            life: 8000
          });
          this.submitting = false;
        }
      });
    }
  }

  showMyRequests(): void {
    this.loadMyRequests();
    this.showRequestsDialog = true;
  }

  cancelRequest(requestId: string): void {
    this.apiService.deleteShiftRequest(requestId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Shift request cancelled'
        });
        this.loadAllData();
      },
      error: (error) => {
        console.error('Error cancelling shift request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to cancel shift request'
        });
      }
    });
  }

  closeRegistrationDialog(): void {
    this.showRegistrationDialog = false;
    this.registrationForm.reset();
    this.selectedDate = null;
    this.selectedShift = null; // Clear selected shift
  }

  closeRequestsDialog(): void {
    this.showRequestsDialog = false;
  }

  closeShiftDetailsDialog(): void {
    this.showShiftDetailsDialog = false;
    this.shiftDetailsData = null;
  }

  applyForShiftFromDetails(): void {
    if (this.shiftDetailsData) {
      this.selectedShift = this.shiftDetailsData.shift;
      this.registrationForm.patchValue({
        date: this.shiftDetailsData.shift.date,
        startTime: this.shiftDetailsData.shift.startTime,
        endTime: this.shiftDetailsData.shift.endTime
      });
      this.closeShiftDetailsDialog();
      this.showRegistrationDialog = true;
    }
  }

  // Helper methods
  isUserAssignedToShift(shift: Shift, userId: string): boolean {
    if (!shift.assignedEmployees || !shift.assignedEmployees.length || !userId) return false;

    // If assignedEmployees contains populated objects
    if (typeof shift.assignedEmployees[0] === 'object' && (shift.assignedEmployees[0] as any)._id) {
      return shift.assignedEmployees.some((emp: any) => emp._id === userId);
    }

    // Handle both Employee objects and string IDs
    return shift.assignedEmployees.some(emp =>
      typeof emp === 'string' ? emp === userId : emp._id === userId
    );
  }

  getAssignedEmployees(shift: Shift): any[] {
    if (!shift.assignedEmployees || !shift.assignedEmployees.length) return [];

    // If assignedEmployees contains populated objects (with name, code, etc.)
    if (typeof shift.assignedEmployees[0] === 'object' && (shift.assignedEmployees[0] as any).name) {
      return shift.assignedEmployees;
    }

    // If assignedEmployees contains just IDs, filter from employees list
    return this.employees.filter(emp => shift.assignedEmployees.includes(emp._id));
  }

  getShiftRequests(shift: Shift, status?: string): ShiftRequest[] {
    return this.allRequests.filter(req => {
      // First check for direct shiftId match
      if (req.shiftId && req.shiftId === shift._id) {
        return !status || req.status === status;
      }

      // For requests without shiftId, match by date and time
      if (req.date && req.startTime && req.endTime) {
        const requestDate = new Date(req.date);
        const shiftDate = new Date(shift.date);

        // Compare dates (ignore time part)
        const dateMatches = requestDate.toDateString() === shiftDate.toDateString();
        const timeMatches = req.startTime === shift.startTime && req.endTime === shift.endTime;

        if (dateMatches && timeMatches) {
          return !status || req.status === status;
        }
      }

      return false;
    });
  }

  getEmployeeName(employeeId: any): string {
    if (typeof employeeId === 'object' && employeeId.name) return employeeId.name;
    const employee = this.employees.find(emp => emp._id === employeeId);
    return employee?.name || 'Unknown Employee';
  }

  getEmployeeInitials(employeeId: any): string {
    const name = this.getEmployeeName(employeeId);
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  showShiftDetails(shift: Shift, assignedEmployees: any[], pendingRequests: ShiftRequest[], isUserAssigned: boolean, userHasPendingRequest: boolean): void {

    let summary = 'Shift Details';
    let statusMessage = '';

    if (isUserAssigned) {
      statusMessage = `✅ You are assigned to this shift`;
      summary = 'Your Shift';
    } else if (userHasPendingRequest) {
      statusMessage = `⏳ Your application is pending approval`;
      summary = 'Application Pending';
    } else if (assignedEmployees.length >= shift.capacity) {
      statusMessage = `❌ This shift is at full capacity`;
      summary = 'Shift Full';
    } else {
      statusMessage = `✨ You can apply for this shift`;
      summary = 'Available Shift';
    }

    // Store shift details data for the dialog
    this.shiftDetailsData = {
      shift: shift,
      assignedEmployees: assignedEmployees,
      pendingRequests: pendingRequests,
      isUserAssigned: isUserAssigned,
      userHasPendingRequest: userHasPendingRequest,
      summary: summary,
      statusMessage: statusMessage
    };

    // Show the shift details dialog
    this.showShiftDetailsDialog = true;
  }
}
