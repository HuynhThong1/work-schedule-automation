import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ShiftCalendarManagerRefactoredComponent } from './shift-calendar-manager-refactored.component';
import { ApiService, Shift, ShiftRequest, ShiftRequestStatus, EmployeeType } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { CalendarService } from '../../../services/calendar.service';

describe('ShiftCalendarManagerRefactoredComponent', () => {
  let component: ShiftCalendarManagerRefactoredComponent;
  let apiService: jest.Mocked<ApiService>;
  let calendarService: jest.Mocked<CalendarService>;
  let messageService: jest.Mocked<MessageService>;

  const mockUser = {
    id: 'manager1',
    name: 'Manager',
    role: 'manager'
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
        { _id: 'emp1', name: 'John Doe', code: 'EMP001', type: EmployeeType.JUNIOR, email: 'john@test.com', phone: '123-456-7890', fullTime: true, salaryByHour: 15, availability: [], isActive: true }
      ],
      manager: 'manager1',
      isPublished: true
    }
  ];

  const mockRequests: ShiftRequest[] = [
    {
      _id: 'req1',
      shiftId: '1',
      employeeId: 'emp2',
      type: 'pickup',
      status: ShiftRequestStatus.PENDING,
      employee: { _id: 'emp2', name: 'Jane Smith', code: 'EMP002', type: EmployeeType.JUNIOR, email: 'jane@test.com', phone: '123-456-7891', fullTime: true, salaryByHour: 15, availability: [], isActive: true },
      shift: mockShifts[0]
    }
  ];

  beforeEach(async () => {
    const apiServiceSpy = {
      getShifts: jest.fn().mockReturnValue(of(mockShifts)),
      getShiftRequests: jest.fn().mockReturnValue(of(mockRequests)),
      getEmployees: jest.fn().mockReturnValue(of([])),
      autoProcessShiftRequests: jest.fn(),
      updateShiftRequestStatus: jest.fn()
    };

    const authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue(mockUser)
    };

    const calendarServiceSpy = {
      getCalendarConfig: jest.fn().mockReturnValue({
        userRole: 'manager',
        height: 'auto',
        editable: true,
        selectable: true
      }),
      convertShiftsToEvents: jest.fn().mockReturnValue([]),
      getTimeSlots: jest.fn().mockReturnValue([
        { time: '06:00:00', label: 'Early Morning', icon: 'pi pi-angle-up' },
        { time: '09:00:00', label: 'Morning', icon: 'pi pi-sun' }
      ])
    };

    const messageServiceSpy = {
      add: jest.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        ShiftCalendarManagerRefactoredComponent,
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CalendarService, useValue: calendarServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    }).compileComponents();

    component = TestBed.inject(ShiftCalendarManagerRefactoredComponent);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    calendarService = TestBed.inject(CalendarService) as jest.Mocked<CalendarService>;
    messageService = TestBed.inject(MessageService) as jest.Mocked<MessageService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct default values', () => {
    expect(component.shifts).toEqual([]);
    expect(component.allRequests).toEqual([]);
    expect(component.allPendingRequests).toEqual([]);
    expect(component.employees).toEqual([]);
    expect(component.calendarEvents).toEqual([]);
    expect(component.showShiftDialog).toBe(false);
    expect(component.showAutoScheduleDialogFlag).toBe(false);
    expect(component.showAllRequestsDialog).toBe(false);
    expect(component.selectedShift).toBeNull();
    expect(component.loading).toBe(false);
    expect(component.autoScheduleLoading).toBe(false);
  });

  it('should load data successfully', async () => {
    // Reset all mocks to ensure clean state
    jest.clearAllMocks();

    // Ensure convertShiftsToEvents returns expected value
    calendarService.convertShiftsToEvents.mockReturnValue([]);

    // Call loadData directly to test the functionality
    await component.loadData();

    expect(apiService.getShifts).toHaveBeenCalled();
    expect(apiService.getShiftRequests).toHaveBeenCalled();
    expect(apiService.getEmployees).toHaveBeenCalled();
    expect(calendarService.convertShiftsToEvents).toHaveBeenCalled();
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

  it('should calculate pending requests count', async () => {
    await component.loadData();

    expect(component.pendingRequestsCount).toBe(1);
  });

  it('should handle header actions', () => {
    const loadDataSpy = jest.spyOn(component, 'loadData').mockResolvedValue();
    const showAutoScheduleSpy = jest.spyOn(component, 'showAutoScheduleDialog');
    const showAllRequestsSpy = jest.spyOn(component, 'showAllRequests');

    component.handleHeaderAction('refresh');
    expect(loadDataSpy).toHaveBeenCalled();

    component.handleHeaderAction('auto-schedule');
    expect(showAutoScheduleSpy).toHaveBeenCalled();

    component.handleHeaderAction('all-requests');
    expect(showAllRequestsSpy).toHaveBeenCalled();
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

  it('should open and close dialogs', () => {
    component.showAutoScheduleDialog();
    expect(component.showAutoScheduleDialogFlag).toBe(true);

    component.closeAutoScheduleDialog();
    expect(component.showAutoScheduleDialogFlag).toBe(false);

    component.showAllRequests();
    expect(component.showAllRequestsDialog).toBe(true);

    component.closeAllRequestsDialog();
    expect(component.showAllRequestsDialog).toBe(false);
  });

  it('should execute auto scheduling successfully', async () => {
    await component.loadData();

    const autoProcessResult = {
      approvedRequests: 2,
      rejectedRequests: 1,
      processedShifts: []
    };

    apiService.autoProcessShiftRequests.mockReturnValue(of(autoProcessResult));
    const loadDataSpy = jest.spyOn(component, 'loadData').mockResolvedValue();

    await component.executeAutoScheduling();

    expect(apiService.autoProcessShiftRequests).toHaveBeenCalled();
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Auto Scheduling Complete',
      detail: 'Approved: 2, Rejected: 1'
    });
    expect(loadDataSpy).toHaveBeenCalled();
    expect(component.showAutoScheduleDialogFlag).toBe(false);
  });

  it('should approve request successfully', async () => {
    const mockResponse: ShiftRequest = {
      _id: 'req1',
      employeeId: 'emp2',
      shiftId: '1',
      type: 'pickup',
      status: ShiftRequestStatus.APPROVED
    };
    apiService.updateShiftRequestStatus.mockReturnValue(of(mockResponse));
    const loadDataSpy = jest.spyOn(component, 'loadData').mockResolvedValue();

    await component.approveRequest(mockRequests[0]);

    expect(apiService.updateShiftRequestStatus).toHaveBeenCalledWith('req1', ShiftRequestStatus.APPROVED);
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Request Approved',
      detail: "Jane Smith's request has been approved"
    });
    expect(loadDataSpy).toHaveBeenCalled();
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
});
