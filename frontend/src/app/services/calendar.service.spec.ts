import { TestBed } from '@angular/core/testing';
import { CalendarService } from './calendar.service';
import { ShiftRequestStatus } from './api.service';

describe('CalendarService', () => {
  let service: CalendarService;

  const mockShift = {
    _id: '1',
    name: 'Morning Shift',
    date: '2025-01-15T00:00:00.000Z',
    startTime: '09:00',
    endTime: '14:00',
    capacity: 3,
    assignedEmployees: [
      { _id: 'emp1', name: 'John Doe', code: 'EMP001', type: 'junior' }
    ],
    pendingRequests: [
      { _id: 'req1', employeeId: 'emp2', status: ShiftRequestStatus.PENDING }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalendarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('convertShiftsToEvents', () => {
    it('should convert shifts to calendar events for manager', () => {
      const shifts = [mockShift];
      const events = service.convertShiftsToEvents(shifts, 'manager');

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('1');
      expect(events[0].title).toContain('Morning Shift');
      expect(events[0].title).toContain('09:00 - 14:00');
      expect(events[0].className).toBe('fc-event-pending');
      expect(events[0].allDay).toBe(false);
    });

    it('should handle full capacity shifts', () => {
      const fullShift = {
        ...mockShift,
        assignedEmployees: [
          { _id: 'emp1', name: 'John', code: 'EMP001', type: 'junior' },
          { _id: 'emp2', name: 'Jane', code: 'EMP002', type: 'senior' },
          { _id: 'emp3', name: 'Bob', code: 'EMP003', type: 'new' }
        ],
        pendingRequests: []
      };

      const events = service.convertShiftsToEvents([fullShift], 'manager');
      expect(events[0].className).toBe('fc-event-full');
      expect(events[0].title).toContain('Full');
    });
  });

  describe('getCalendarConfig', () => {
    it('should return manager configuration', () => {
      const config = service.getCalendarConfig('manager');

      expect(config.userRole).toBe('manager');
      expect(config.editable).toBe(true);
      expect(config.selectable).toBe(true);
      expect(config.height).toBe('auto');
    });

    it('should return employee configuration', () => {
      const config = service.getCalendarConfig('employee');

      expect(config.userRole).toBe('employee');
      expect(config.editable).toBe(false);
      expect(config.selectable).toBe(true);
    });
  });

  describe('getTimeSlots', () => {
    it('should return predefined time slots', () => {
      const timeSlots = service.getTimeSlots();

      expect(timeSlots).toHaveLength(5);
      expect(timeSlots[0]).toEqual({
        time: '06:00:00',
        label: 'Early Morning',
        icon: 'pi pi-angle-up'
      });
    });
  });

  describe('canInteractWithShift', () => {
    it('should allow manager to interact with any shift', () => {
      const canInteract = service.canInteractWithShift(mockShift, 'manager');
      expect(canInteract).toBe(true);
    });

    it('should allow employee to interact with available shift', () => {
      const availableShift = {
        ...mockShift,
        assignedEmployees: [],
        pendingRequests: []
      };

      const canInteract = service.canInteractWithShift(availableShift, 'employee', 'emp2');
      expect(canInteract).toBe(true);
    });

    it('should not allow employee to interact with full shift', () => {
      const fullShift = {
        ...mockShift,
        assignedEmployees: [
          { _id: 'emp1', name: 'John', code: 'EMP001', type: 'junior' },
          { _id: 'emp2', name: 'Jane', code: 'EMP002', type: 'senior' },
          { _id: 'emp3', name: 'Bob', code: 'EMP003', type: 'new' }
        ]
      };

      const canInteract = service.canInteractWithShift(fullShift, 'employee', 'emp4');
      expect(canInteract).toBe(false);
    });
  });

  describe('getShiftStatusText', () => {
    it('should return correct status text', () => {
      const fullShift = {
        ...mockShift,
        assignedEmployees: [
          { _id: 'emp1', name: 'John', code: 'EMP001', type: 'junior' },
          { _id: 'emp2', name: 'Jane', code: 'EMP002', type: 'senior' },
          { _id: 'emp3', name: 'Bob', code: 'EMP003', type: 'new' }
        ],
        pendingRequests: []
      };

      expect(service.getShiftStatusText(fullShift)).toBe('Full');
      expect(service.getShiftStatusText(mockShift)).toBe('1 Pending');
    });
  });

  describe('getShiftStatusClass', () => {
    it('should return correct CSS classes', () => {
      const fullShift = {
        ...mockShift,
        assignedEmployees: new Array(3).fill({ _id: 'emp', name: 'Employee' }),
        pendingRequests: []
      };
      expect(service.getShiftStatusClass(fullShift)).toBe('fc-event-full');
      expect(service.getShiftStatusClass(mockShift)).toBe('fc-event-pending');
    });
  });
});
