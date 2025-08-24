import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg } from '@fullcalendar/core';
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

import { ApiService, Shift, ShiftRequest } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

// Remove local interface since we're importing from API service

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
    height: 'auto'
  };

  shifts: Shift[] = [];
  myRequests: ShiftRequest[] = [];
  showRegistrationDialog = false;
  showRequestsDialog = false;
  submitting = false;
  selectedDate: Date | null = null;

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
    this.loadShifts();
    this.loadMyRequests();
  }

  loadShifts(): void {
    this.apiService.getShifts().subscribe({
      next: (shifts) => {
        this.shifts = shifts;
        this.updateCalendarEvents();
      },
      error: (error) => {
        console.error('Error loading shifts:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load shifts'
        });
      }
    });
  }

  loadMyRequests(): void {
    this.apiService.getMyShiftRequests().subscribe({
      next: (requests) => {
        this.myRequests = requests;
      },
      error: (error) => {
        console.error('Error loading shift requests:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load shift requests'
        });
      }
    });
  }

  updateCalendarEvents(): void {
    const events = this.shifts.map(shift => {
      const currentUser = this.authService.getCurrentUser();
      let className = 'fc-event-available';
      let title = 'Available Shift';

      if (shift.assignedEmployees.includes(currentUser?.id || '')) {
        className = 'fc-event-assigned';
        title = 'Your Shift';
      } else if (shift.assignedEmployees.length >= shift.capacity) {
        className = 'fc-event-full';
        title = 'Shift Full';
      }

      return {
        id: shift._id,
        title: title,
        start: new Date(shift.date).toISOString().split('T')[0] + 'T' + shift.startTime,
        end: new Date(shift.date).toISOString().split('T')[0] + 'T' + shift.endTime,
        className: className,
        extendedProps: {
          shift: shift
        }
      };
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };
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
    const currentUser = this.authService.getCurrentUser();

    if (shift.assignedEmployees.includes(currentUser?.id || '')) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'You are already assigned to this shift'
      });
    } else if (shift.assignedEmployees.length >= shift.capacity) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'This shift is already at full capacity'
      });
    } else {
      // Pre-fill form with shift details
      this.registrationForm.patchValue({
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime
      });
      this.showRegistrationDialog = true;
    }
  }

  handleEvents(events: any): void {
    // Handle events if needed
  }

  submitShiftRequest(): void {
    if (this.registrationForm.valid) {
      this.submitting = true;
      const formData = this.registrationForm.value;
      const currentUser = this.authService.getCurrentUser();

      const shiftRequest: Partial<ShiftRequest> = {
        employeeId: currentUser?.id || '',
        type: 'pickup',
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
          this.loadMyRequests();
        },
        error: (error) => {
          console.error('Error submitting shift request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to submit shift request'
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
        this.loadMyRequests();
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
  }

  closeRequestsDialog(): void {
    this.showRequestsDialog = false;
  }
}
