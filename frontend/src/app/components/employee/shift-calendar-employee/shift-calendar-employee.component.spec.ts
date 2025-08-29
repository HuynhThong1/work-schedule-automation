import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ShiftCalendarEmployeeComponent } from './shift-calendar-employee.component';
import { ApiService, Shift, ShiftRequest, ShiftRequestStatus } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { CalendarService } from '../../../services/calendar.service';
import { DynamicCalendarComponent } from '../../shared/dynamic-calendar/dynamic-calendar.component';
import { CalendarHeaderComponent } from '../../shared/calendar-header/calendar-header.component';

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
        { _id: 'emp2', name: 'Jane Smith', code: 'EMP002', type: 'senior' }
      ]
    }
  ];

  const mockRequests: ShiftRequest[] = [
    {
      _id: 'req1',
      shiftId: '1',
      employeeId: 'emp1',
      status: ShiftRequestStatus.PENDING,
      employee: { _id: 'emp1', name: 'John Doe', code: 'EMP001' },
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
        ShiftCalendarEmployeeComponent,
        DynamicCalendarComponent,
        CalendarHeaderComponent
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

    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    calendarService = TestBed.inject(CalendarService) as jest.Mocked<CalendarService>;
    messageService = TestBed.inject(MessageService) as jest.Mocked<MessageService>;
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
    await component.ngOnInit();

    expect(apiService.getShifts).toHaveBeenCalled();
    expect(apiService.getShiftRequests).toHaveBeenCalled();
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

    apiService.createShiftRequest.mockReturnValue(of({}));
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
    apiService.deleteShiftRequest.mockReturnValue(of({}));
    const loadDataSpy = jest.spyOn(component, 'loadData').mockResolvedValue();
    const closeDialogSpy = jest.spyOn(component, 'closeShiftDialog');

    await component.cancelRequest(request);

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
      assignedEmployees: [{ _id: 'emp1', name: 'John' }]
    };

    const capacityText = component.getShiftCapacityText(shift);
    expect(capacityText).toBe('1/3 assigned');
  });

  it('should return correct employee type severity', () => {
    expect(component.getEmployeeTypeSeverity('senior')).toBe('success');
    expect(component.getEmployeeTypeSeverity('junior')).toBe('info');
    expect(component.getEmployeeTypeSeverity('new')).toBe('warning');
    expect(component.getEmployeeTypeSeverity('unknown')).toBe('info');
  });

  it('should return correct request status severity', () => {
    expect(component.getRequestStatusSeverity('approved')).toBe('success');
    expect(component.getRequestStatusSeverity('rejected')).toBe('danger');
    expect(component.getRequestStatusSeverity('pending')).toBe('warning');
    expect(component.getRequestStatusSeverity('unknown')).toBe('info');
  });

  it('should format time correctly', () => {
    const formattedTime = component['formatTime']('09:00');
    expect(formattedTime).toBe('09:00:00');

    const alreadyFormattedTime = component['formatTime']('09:00:00');
    expect(alreadyFormattedTime).toBe('09:00:00');
  });
});
