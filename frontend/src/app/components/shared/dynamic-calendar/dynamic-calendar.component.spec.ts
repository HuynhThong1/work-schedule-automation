import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { DynamicCalendarComponent, CalendarEvent, CalendarConfig } from './dynamic-calendar.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DynamicCalendarComponent', () => {
  let component: DynamicCalendarComponent;
  let fixture: ComponentFixture<DynamicCalendarComponent>;

  const mockCalendarConfig: CalendarConfig = {
    userRole: 'manager',
    height: 'auto',
    slotMinTime: '06:00:00',
    slotMaxTime: '24:00:00',
    scrollTime: '08:00:00',
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      startTime: '08:00',
      endTime: '23:00'
    },
    editable: true,
    selectable: true
  };

  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Morning Shift\n09:00 - 14:00',
      start: '2025-01-15T09:00:00',
      end: '2025-01-15T14:00:00',
      className: 'fc-event-available',
      allDay: false,
      extendedProps: {
        shift: {
          _id: '1',
          name: 'Morning Shift',
          date: '2025-01-15',
          startTime: '09:00',
          endTime: '14:00',
          capacity: 3
        }
      }
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicCalendarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicCalendarComponent);
    component = fixture.componentInstance;
    component.config = mockCalendarConfig;
    component.events = mockEvents;
  });

  afterEach(() => {
    if (fixture) {
      // Clean up the fixture without detecting changes to avoid FullCalendar cleanup issues
      try {
        fixture.destroy();
      } catch {
        // Ignore cleanup errors from FullCalendar
      }
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.events).toEqual(mockEvents);
    expect(component.config).toEqual(mockCalendarConfig);
    expect(component.loading).toBe(false);
  });

  it('should setup calendar options on init', () => {
    component.ngOnInit();

    expect(component.calendarOptions).toBeDefined();
    expect(component.calendarOptions.plugins).toBeDefined();
    expect(component.calendarOptions.initialView).toBe('timeGridWeek');
    expect(component.calendarOptions.height).toBe('auto');
    expect(component.calendarOptions.slotMinTime).toBe('06:00:00');
    expect(component.calendarOptions.slotMaxTime).toBe('24:00:00');
  });

  it('should configure manager-specific options', () => {
    component.config = { ...mockCalendarConfig, userRole: 'manager' };
    component.ngOnInit();

    expect(component.calendarOptions.editable).toBe(true);
    expect(component.calendarOptions.selectable).toBe(true);
  });

  it('should configure employee-specific options', () => {
    component.config = { ...mockCalendarConfig, userRole: 'employee' };
    component.ngOnInit();

    expect(component.calendarOptions.editable).toBe(false);
    expect(component.calendarOptions.selectable).toBe(true);
  });

  it('should update calendar events on changes', () => {
    const newEvents: CalendarEvent[] = [
      {
        id: '2',
        title: 'Afternoon Shift',
        start: '2025-01-15T14:00:00',
        end: '2025-01-15T18:00:00',
        className: 'fc-event-assigned',
        allDay: false
      }
    ];

    component.ngOnChanges({
      events: new SimpleChange(mockEvents, newEvents, false)
    });

    expect(component.calendarOptions.events).toBeDefined();
  });

  it('should emit eventClick when event is clicked', () => {
    const emitSpy = jest.spyOn(component.eventClick, 'emit');

    const mockEventInfo = {
      event: { id: '1', title: 'Test Event' },
      jsEvent: new MouseEvent('click'),
      view: {}
    };

    component['handleEventClick'](mockEventInfo);

    expect(emitSpy).toHaveBeenCalledWith({
      event: mockEventInfo.event,
      jsEvent: mockEventInfo.jsEvent,
      view: mockEventInfo.view
    });
  });

  it('should update scroll time', () => {
    const newTime = '14:00:00';
    component.scrollToTime(newTime);

    expect(component.calendarOptions.scrollTime).toBe(newTime);
  });

  it('should handle empty events gracefully', () => {
    component.events = [];
    component.ngOnInit();

    expect(component.calendarOptions.events).toBeDefined();
    expect(component.calendarOptions.events).toEqual([]);
  });

  it('should use default config values when not provided', () => {
    component.config = { userRole: 'manager' };
    component.ngOnInit();

    expect(component.calendarOptions.height).toBe('auto');
    expect(component.calendarOptions.slotMinTime).toBe('06:00:00');
    expect(component.calendarOptions.slotMaxTime).toBe('24:00:00');
    expect(component.calendarOptions.scrollTime).toBe('08:00:00');
  });
});
