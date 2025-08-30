import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { Component, Input, Output, EventEmitter } from '@angular/core';
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
import { ShiftCalendarEmployeeComponent } from './shift-calendar-employee.component';
import { ApiService, Shift, ShiftRequest, ShiftRequestStatus, Employee, EmployeeType } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { CalendarService } from '../../../services/calendar.service';

// Mock components to avoid DOM issues
@Component({
  selector: 'app-dynamic-calendar',
  template: '<div></div>',
  standalone: true
})
class MockDynamicCalendarComponent {
  @Input() events = [];
  @Input() config = {};
  @Input() loading = false;
  @Output() eventClick = new EventEmitter();
  @Output() dateSelect = new EventEmitter();
}

@Component({
  selector: 'app-calendar-header',
  template: '<div></div>',
  standalone: true
})
class MockCalendarHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() headerIcon = '';
  @Input() actions = [];
  @Input() showTimeNavigation = false;
  @Output() actionClick = new EventEmitter();
  @Output() timeNavigate = new EventEmitter();
}

describe('ShiftCalendarEmployeeComponent', () => {
  let component: ShiftCalendarEmployeeComponent;
  let fixture: ComponentFixture<ShiftCalendarEmployeeComponent>;
  let apiService: jest.Mocked<ApiService>;
  let authService: jest.Mocked<AuthService>;
  let calendarService: jest.Mocked<CalendarService>;
  let messageService: jest.Mocked<MessageService>;

  const mockUser = {
    id: 'emp1',
    name: 'John Doe',
    role: 'employee'
  };

  const mockShifts: Shift[] = [
    {
      _id: '1',
      name: 'Morning Shift',
      date: '2025-01-15T00:00:00.000Z',
      startTime: '09:00',
      endTime: '14:00',
      capacity: 3,
      assignedEmployees: [
        {
          _id: 'emp2',
          name: 'Jane Smith',
          code: 'EMP002',
          email: 'jane@example.com',
          phone: '123-456-7890',
          type: EmployeeType.SENIOR,
          fullTime: true,
          salaryByHour: 20,
          availability: [],
          isActive: true
        }
      ],
      manager: 'mgr1',
      isPublished: true
    }
  ];

  const mockRequests: ShiftRequest[] = [
    {
      _id: 'req1',
      shiftId: '1',
      employeeId: 'emp1',
      type: 'pickup',
      status: ShiftRequestStatus.PENDING,
      employee: {
        _id: 'emp1',
        name: 'John Doe',
        code: 'EMP001',
        email: 'john@example.com',
        phone: '123-456-7890',
        type: EmployeeType.JUNIOR,
        fullTime: true,
        salaryByHour: 15,
        availability: [],
        isActive: true
      },
      shift: mockShifts[0]
    }
  ];

  beforeEach(async () => {
    const apiServiceSpy = {
      getShifts: jest.fn().mockReturnValue(of(mockShifts)),
      getShiftRequests: jest.fn().mockReturnValue(of(mockRequests)),
      createShiftRequest: jest.fn(),
      deleteShiftRequest: jest.fn()
    };

    const authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue(mockUser)
    };

    const calendarServiceSpy = {
      getCalendarConfig: jest.fn().mockReturnValue({
        userRole: 'employee',
        height: 'auto',
        editable: false,
        selectable: true
      }),
      canInteractWithShift: jest.fn().mockReturnValue(true),
      getTimeSlots: jest.fn().mockReturnValue([
        { time: '06:00:00', label: 'Early Morning', icon: 'pi pi-angle-up' },
        { time: '09:00:00', label: 'Morning', icon: 'pi pi-sun' }
      ])
    };

    const messageServiceSpy = {
      add: jest.fn()
    };

    await TestBed.configureTestingModule({
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
        ShiftCalendarEmployeeComponent,
        MockDynamicCalendarComponent,
        MockCalendarHeaderComponent
      ],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CalendarService, useValue: calendarServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftCalendarEmployeeComponent);
    component = fixture.componentInstance;

    // Prevent automatic initialization
    jest.spyOn(component, 'ngOnInit').mockImplementation(() => {
      // Do nothing to prevent automatic loading
    });

    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    calendarService = TestBed.inject(CalendarService) as jest.Mocked<CalendarService>;
    messageService = TestBed.inject(MessageService) as jest.Mocked<MessageService>;
  });

  afterEach(() => {
    // Ensure proper cleanup to prevent DOM errors
    if (component) {
      component.loading = false;
      component.requestLoading = false;
      component.showShiftDialog = false;
      component.showMyRequestsDialog = false;
    }
    if (fixture) {
      try {
        fixture.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct default values', () => {
    expect(component.shifts).toEqual([]);
    expect(component.myRequests).toEqual([]);
    expect(component.calendarEvents).toEqual([]);
    expect(component.showShiftDialog).toBe(false);
    expect(component.showMyRequestsDialog).toBe(false);
    expect(component.selectedShift).toBeNull();
    expect(component.loading).toBe(false);
    expect(component.requestLoading).toBe(false);
  });

  it('should load data on init', async () => {
    // Restore ngOnInit for this test
    (component.ngOnInit as jest.Mock).mockRestore();

    // Mock loadData method to avoid DOM operations
    const loadDataSpy = jest.spyOn(component, 'loadData').mockImplementation(async () => {
      component.loading = false;
    });

    await component.ngOnInit();

    expect(loadDataSpy).toHaveBeenCalled();
  });

  it('should filter requests for current user', async () => {
    await component.loadData();

    expect(component.myRequests).toHaveLength(1);
    expect(component.myRequests[0].employeeId).toBe('emp1');
  });

  it('should calculate pending requests count', async () => {
    await component.loadData();

    expect(component.myPendingRequestsCount).toBe(1);
  });

  it('should handle data loading error', async () => {
    apiService.getShifts.mockReturnValue(throwError(() => new Error('API Error')));

    await component.loadData();

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load calendar data'
    });
    expect(component.loading).toBe(false);
  });

  it('should handle header actions', () => {
    const loadDataSpy = jest.spyOn(component, 'loadData').mockResolvedValue();
    const showMyRequestsSpy = jest.spyOn(component, 'showMyRequests');

    component.handleHeaderAction('refresh');
    expect(loadDataSpy).toHaveBeenCalled();

    component.handleHeaderAction('my-requests');
    expect(showMyRequestsSpy).toHaveBeenCalled();
  });

  it('should handle event click', async () => {
    await component.loadData();

    const eventInfo = {
      event: { id: '1' }
    };

    component.handleEventClick(eventInfo);

    expect(component.selectedShift).toBeTruthy();
    expect(component.selectedShift?._id).toBe('1');
    expect(component.showShiftDialog).toBe(true);
  });

  it('should request shift successfully', async () => {
    await component.loadData();

    const availableShift = {
      ...component.shifts[0],
      canRequest: true
    };

    apiService.createShiftRequest.mockReturnValue(of(mockRequests[0]));
    const loadDataSpy = jest.spyOn(component, 'loadData').mockResolvedValue();
    const closeDialogSpy = jest.spyOn(component, 'closeShiftDialog');

    await component.requestShift(availableShift);

    expect(apiService.createShiftRequest).toHaveBeenCalledWith({
      shiftId: availableShift._id,
      employeeId: mockUser.id
    });
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Request Submitted',
      detail: `Your request for ${availableShift.name} has been submitted`
    });
    expect(loadDataSpy).toHaveBeenCalled();
    expect(closeDialogSpy).toHaveBeenCalled();
  });

  it('should cancel request successfully', async () => {
    const request = mockRequests[0];

    // Set up spies before the test
    apiService.deleteShiftRequest.mockReturnValue(of(undefined));

    const loadDataSpy = jest.spyOn(component, 'loadData').mockImplementation(async () => {
      // Mock implementation that doesn't trigger DOM operations
      component.loading = false;
    });

    // Mock closeShiftDialog method
    const closeDialogSpy = jest.spyOn(component, 'closeShiftDialog').mockImplementation(() => {
      // Mock implementation that doesn't trigger DOM operations
      component.showShiftDialog = false;
      component.selectedShift = null;
    });

    // Set required initial state
    component.showShiftDialog = true;
    component.requestLoading = false;

    // Call the method under test
    await component.cancelRequest(request);

    // Verify the expectations
    expect(apiService.deleteShiftRequest).toHaveBeenCalledWith('req1');
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Request Cancelled',
      detail: 'Your shift request has been cancelled'
    });
    expect(loadDataSpy).toHaveBeenCalled();
    expect(closeDialogSpy).toHaveBeenCalled();
  });

  it('should return correct shift capacity text', () => {
    const shift = {
      ...mockShifts[0],
      assignedEmployees: [{
        _id: 'emp1',
        name: 'John',
        code: 'EMP001',
        email: 'john@example.com',
        phone: '123-456-7890',
        type: EmployeeType.JUNIOR,
        fullTime: true,
        salaryByHour: 15,
        availability: [],
        isActive: true
      }],
      requests: [],
      pendingRequests: [],
      approvedRequests: [],
      canRequest: false,
      userRequest: undefined
    };

    const capacityText = component.getShiftCapacityText(shift);
    expect(capacityText).toBe('1/3 assigned');
  });

  it('should return correct employee type severity', () => {
    expect(component.getEmployeeTypeSeverity(EmployeeType.SENIOR)).toBe('success');
    expect(component.getEmployeeTypeSeverity(EmployeeType.JUNIOR)).toBe('info');
    expect(component.getEmployeeTypeSeverity(EmployeeType.NEW)).toBe('warning');
    expect(component.getEmployeeTypeSeverity('unknown' as EmployeeType)).toBe('info');
  });

  it('should return correct request status severity', () => {
    expect(component.getRequestStatusSeverity(ShiftRequestStatus.APPROVED)).toBe('success');
    expect(component.getRequestStatusSeverity(ShiftRequestStatus.REJECTED)).toBe('danger');
    expect(component.getRequestStatusSeverity(ShiftRequestStatus.PENDING)).toBe('warning');
    expect(component.getRequestStatusSeverity('unknown' as ShiftRequestStatus)).toBe('info');
  });

  it('should format time correctly', () => {
    const formattedTime = component['formatTime']('09:00');
    expect(formattedTime).toBe('09:00:00');

    const alreadyFormattedTime = component['formatTime']('09:00:00');
    expect(alreadyFormattedTime).toBe('09:00:00');
  });
});
