import { Injectable } from '@angular/core';
import { CalendarEvent, CalendarConfig } from '../components/shared/dynamic-calendar/dynamic-calendar.component';
import { ShiftRequestStatus, EmployeeType } from './api.service';

export interface Shift {
  _id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  assignedEmployees?: any[];
  pendingRequests?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  /**
   * Convert shifts to calendar events
   */
  convertShiftsToEvents(shifts: Shift[], userRole: 'manager' | 'employee'): CalendarEvent[] {
    return shifts.map(shift => {
      const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
      const pendingCount = shift.pendingRequests ? shift.pendingRequests.length : 0;

      // Determine event styling and title based on shift status
      let className = 'fc-event-available';
      let title = `${shift.name}\n${shift.startTime} - ${shift.endTime}`;

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
          assignedEmployees: shift.assignedEmployees,
          pendingRequests: shift.pendingRequests,
          userRole: userRole
        }
      };
    });
  }

  /**
   * Get calendar configuration based on user role
   */
  getCalendarConfig(userRole: 'manager' | 'employee', customConfig?: Partial<CalendarConfig>): CalendarConfig {
    const baseConfig: CalendarConfig = {
      userRole: userRole,
      height: 'auto',
      slotMinTime: '06:00:00',
      slotMaxTime: '24:00:00',
      scrollTime: '08:00:00',
      businessHours: {
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // Monday - Sunday
        startTime: '08:00',
        endTime: '23:00'
      }
    };

    if (userRole === 'manager') {
      baseConfig.editable = true;
      baseConfig.selectable = true;
    } else {
      baseConfig.editable = false;
      baseConfig.selectable = true; // Allow employees to select for shift requests
    }

    return { ...baseConfig, ...customConfig };
  }

  /**
   * Format time string to HH:MM:SS
   */
  private formatTime(time: string): string {
    const parts = time.split(':');
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    return time;
  }

  /**
   * Get available time slots for quick navigation
   */
  getTimeSlots(): Array<{ time: string; label: string; icon: string }> {
    return [
      { time: '06:00:00', label: 'Early Morning', icon: 'pi pi-angle-up' },
      { time: '09:00:00', label: 'Morning', icon: 'pi pi-sun' },
      { time: '14:00:00', label: 'Afternoon', icon: 'pi pi-clock' },
      { time: '18:00:00', label: 'Evening', icon: 'pi pi-moon' },
      { time: '22:00:00', label: 'Late Night', icon: 'pi pi-angle-down' }
    ];
  }

  /**
   * Check if user can interact with a shift based on role and shift status
   */
  canInteractWithShift(shift: any, userRole: 'manager' | 'employee', userId?: string): boolean {
    if (userRole === 'manager') {
      return true; // Managers can interact with all shifts
    }

    // Employee logic
    const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
    const isAlreadyAssigned = shift.assignedEmployees?.some((emp: any) => emp._id === userId);
    const hasPendingRequest = shift.pendingRequests?.some((req: any) => req.employeeId === userId);

    // Employee can interact if:
    // - Shift is not full
    // - They are not already assigned
    // - They don't have a pending request
    return assignedCount < shift.capacity && !isAlreadyAssigned && !hasPendingRequest;
  }

  /**
   * Get shift status text for display
   */
  getShiftStatusText(shift: Shift): string {
    const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
    const pendingCount = shift.pendingRequests ? shift.pendingRequests.length : 0;

    if (assignedCount >= shift.capacity) {
      return 'Full';
    } else if (pendingCount > 0) {
      return `${pendingCount} Pending`;
    } else if (assignedCount > 0) {
      return `${assignedCount}/${shift.capacity} Assigned`;
    } else {
      return 'Available';
    }
  }

  /**
   * Get CSS class for shift status
   */
  getShiftStatusClass(shift: Shift): string {
    const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;
    const pendingCount = shift.pendingRequests ? shift.pendingRequests.length : 0;

    if (assignedCount >= shift.capacity) {
      return 'fc-event-full';
    } else if (pendingCount > 0) {
      return 'fc-event-pending';
    } else if (assignedCount > 0) {
      return 'fc-event-assigned';
    } else {
      return 'fc-event-available';
    }
  }
}
