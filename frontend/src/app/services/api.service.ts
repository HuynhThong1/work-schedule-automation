import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Employee {
  _id?: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  type: 'new' | 'junior';
  fullTime: boolean;
  salaryByHour: number;
  availability: AvailabilitySlot[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Manager {
  _id?: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  level: 'middle' | 'senior';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AvailabilitySlot {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
}

export interface Shift {
  _id?: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  assignedEmployees: string[];
  manager: string;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Rule {
  _id?: string;
  name: string;
  description: string;
  type: 'assignment' | 'constraint' | 'priority';
  parameters: any;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Schedule {
  _id?: string;
  startDate: Date;
  endDate: Date;
  shifts: string[];
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Timesheet {
  _id?: string;
  employee: string;
  month: number;
  year: number;
  totalHours: number;
  totalPay: number;
  isFinalized: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShiftRequest {
  _id?: string;
  employeeId: string;
  shiftId?: string;
  type: 'pickup' | 'drop' | 'swap';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  targetShiftId?: string;
  swapWithEmployeeId?: string;
  // For direct shift requests
  date?: Date;
  startTime?: string;
  endTime?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('API Error:', error);
    return throwError(() => errorMessage);
  }

  // Employee Management
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.baseUrl}/employees`)
      .pipe(catchError(this.handleError));
  }

  getEmployee(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/employees/${id}`)
      .pipe(catchError(this.handleError));
  }

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(`${this.baseUrl}/employees`, employee)
      .pipe(catchError(this.handleError));
  }

  updateEmployee(id: string, employee: Partial<Employee>): Observable<Employee> {
    return this.http.patch<Employee>(`${this.baseUrl}/employees/${id}`, employee)
      .pipe(catchError(this.handleError));
  }

  deleteEmployee(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/employees/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Manager Management
  getManagers(): Observable<Manager[]> {
    return this.http.get<Manager[]>(`${this.baseUrl}/managers`)
      .pipe(catchError(this.handleError));
  }

  createManager(manager: Partial<Manager>): Observable<Manager> {
    return this.http.post<Manager>(`${this.baseUrl}/managers`, manager)
      .pipe(catchError(this.handleError));
  }

  updateManager(id: string, manager: Partial<Manager>): Observable<Manager> {
    return this.http.patch<Manager>(`${this.baseUrl}/managers/${id}`, manager)
      .pipe(catchError(this.handleError));
  }

  deleteManager(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/managers/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Shift Management
  getShifts(params?: any): Observable<Shift[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<Shift[]>(`${this.baseUrl}/shifts`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  createShift(shift: Partial<Shift>): Observable<Shift> {
    return this.http.post<Shift>(`${this.baseUrl}/shifts`, shift)
      .pipe(catchError(this.handleError));
  }

  updateShift(id: string, shift: Partial<Shift>): Observable<Shift> {
    return this.http.patch<Shift>(`${this.baseUrl}/shifts/${id}`, shift)
      .pipe(catchError(this.handleError));
  }

  deleteShift(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/shifts/${id}`)
      .pipe(catchError(this.handleError));
  }

  assignEmployeeToShift(shiftId: string, employeeId: string): Observable<Shift> {
    return this.http.post<Shift>(`${this.baseUrl}/shifts/${shiftId}/assign`, { employeeId })
      .pipe(catchError(this.handleError));
  }

  // Rule Management
  getRules(): Observable<Rule[]> {
    return this.http.get<Rule[]>(`${this.baseUrl}/rules`)
      .pipe(catchError(this.handleError));
  }

  createRule(rule: Partial<Rule>): Observable<Rule> {
    return this.http.post<Rule>(`${this.baseUrl}/rules`, rule)
      .pipe(catchError(this.handleError));
  }

  updateRule(id: string, rule: Partial<Rule>): Observable<Rule> {
    return this.http.patch<Rule>(`${this.baseUrl}/rules/${id}`, rule)
      .pipe(catchError(this.handleError));
  }

  deleteRule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/rules/${id}`)
      .pipe(catchError(this.handleError));
  }

  activateRule(id: string): Observable<Rule> {
    return this.http.patch<Rule>(`${this.baseUrl}/rules/${id}/activate`, {})
      .pipe(catchError(this.handleError));
  }

  deactivateRule(id: string): Observable<Rule> {
    return this.http.patch<Rule>(`${this.baseUrl}/rules/${id}/deactivate`, {})
      .pipe(catchError(this.handleError));
  }

  // Schedule Management
  getSchedules(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${this.baseUrl}/schedules`)
      .pipe(catchError(this.handleError));
  }

  createSchedule(schedule: Partial<Schedule>): Observable<Schedule> {
    return this.http.post<Schedule>(`${this.baseUrl}/schedules`, schedule)
      .pipe(catchError(this.handleError));
  }

  generateSchedule(params: any): Observable<Schedule> {
    return this.http.post<Schedule>(`${this.baseUrl}/schedules/generate`, params)
      .pipe(catchError(this.handleError));
  }

  publishSchedule(id: string): Observable<Schedule> {
    return this.http.patch<Schedule>(`${this.baseUrl}/schedules/${id}/publish`, {})
      .pipe(catchError(this.handleError));
  }

  // Timesheet Management
  getTimesheets(): Observable<Timesheet[]> {
    return this.http.get<Timesheet[]>(`${this.baseUrl}/timesheets`)
      .pipe(catchError(this.handleError));
  }

  calculateTimesheet(employeeId: string, month: number, year: number): Observable<Timesheet> {
    return this.http.post<Timesheet>(`${this.baseUrl}/timesheets/calculate/${employeeId}`, { month, year })
      .pipe(catchError(this.handleError));
  }

  finalizeTimesheet(id: string): Observable<Timesheet> {
    return this.http.patch<Timesheet>(`${this.baseUrl}/timesheets/${id}/finalize`, {})
      .pipe(catchError(this.handleError));
  }

  // Shift Request Management
  getShiftRequests(): Observable<ShiftRequest[]> {
    return this.http.get<ShiftRequest[]>(`${this.baseUrl}/shift-requests`)
      .pipe(catchError(this.handleError));
  }

  getMyShiftRequests(): Observable<ShiftRequest[]> {
    return this.http.get<ShiftRequest[]>(`${this.baseUrl}/shift-requests/my-requests`)
      .pipe(catchError(this.handleError));
  }

  createShiftRequest(request: Partial<ShiftRequest>): Observable<ShiftRequest> {
    return this.http.post<ShiftRequest>(`${this.baseUrl}/shift-requests`, request)
      .pipe(catchError(this.handleError));
  }

  updateShiftRequest(id: string, request: Partial<ShiftRequest>): Observable<ShiftRequest> {
    return this.http.patch<ShiftRequest>(`${this.baseUrl}/shift-requests/${id}`, request)
      .pipe(catchError(this.handleError));
  }

  approveShiftRequest(id: string, reviewNotes?: string): Observable<ShiftRequest> {
    return this.http.patch<ShiftRequest>(`${this.baseUrl}/shift-requests/${id}/approve`, { reviewNotes })
      .pipe(catchError(this.handleError));
  }

  rejectShiftRequest(id: string, reviewNotes?: string): Observable<ShiftRequest> {
    return this.http.patch<ShiftRequest>(`${this.baseUrl}/shift-requests/${id}/reject`, { reviewNotes })
      .pipe(catchError(this.handleError));
  }

  deleteShiftRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/shift-requests/${id}`)
      .pipe(catchError(this.handleError));
  }
}
