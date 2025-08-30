import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  className?: string;
  allDay?: boolean;
  extendedProps?: any;
}

export interface CalendarConfig {
  userRole: 'manager' | 'employee';
  height?: number | 'auto';
  slotMinTime?: string;
  slotMaxTime?: string;
  scrollTime?: string;
  businessHours?: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };
  editable?: boolean;
  selectable?: boolean;
}

@Component({
  selector: 'app-dynamic-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  template: `
    <div class="calendar-wrapper" [class]="'calendar-' + config.userRole">
      <full-calendar [options]="calendarOptions"></full-calendar>
    </div>
  `,
  styleUrls: ['./dynamic-calendar.component.scss']
})
export class DynamicCalendarComponent implements OnInit, OnChanges {
  @Input() events: CalendarEvent[] = [];
  @Input() config: CalendarConfig = { userRole: 'manager' };
  @Input() loading = false;

  @Output() eventClick = new EventEmitter<any>();
  @Output() dateSelect = new EventEmitter<any>();
  @Output() eventDrop = new EventEmitter<any>();
  @Output() eventResize = new EventEmitter<any>();

  calendarOptions: CalendarOptions = {};

  ngOnInit(): void {
    this.setupCalendarOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['events'] && this.events) {
      this.updateCalendarEvents();
    }
    if (changes['config']) {
      this.setupCalendarOptions();
    }
  }

  private setupCalendarOptions(): void {
    const baseOptions: CalendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      height: this.config.height || 'auto',
      slotMinTime: this.config.slotMinTime || '06:00:00',
      slotMaxTime: this.config.slotMaxTime || '24:00:00',
      slotDuration: '01:00:00',
      slotLabelInterval: '01:00:00',
      allDaySlot: false,
      nowIndicator: true,
      scrollTime: this.config.scrollTime || '08:00:00',
      weekends: true,
      dayMaxEvents: true,

      // Event display settings
      eventDisplay: 'block',
      displayEventTime: false,
      displayEventEnd: false,
      eventMinHeight: 0,
      expandRows: true,
      stickyHeaderDates: true,

      // Time formatting
      dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric' },
      slotLabelFormat: {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      },
      eventTimeFormat: {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      },

      // Business hours
      businessHours: this.config.businessHours || {
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
        startTime: '08:00',
        endTime: '23:00'
      },

      // Event positioning
      eventOverlap: true,
      slotEventOverlap: false,
      snapDuration: '00:15:00',

      // Event handlers
      eventClick: this.handleEventClick.bind(this),
      select: this.handleDateSelect.bind(this),
      eventDrop: this.handleEventDrop.bind(this),
      eventResize: this.handleEventResize.bind(this)
    };

    // Role-specific configurations
    if (this.config.userRole === 'manager') {
      baseOptions.editable = this.config.editable !== false;
      baseOptions.selectable = this.config.selectable !== false;
    } else {
      baseOptions.editable = false;
      baseOptions.selectable = true; // Allow employees to select time slots for requests
    }

    this.calendarOptions = baseOptions;
    this.updateCalendarEvents();
  }

  private updateCalendarEvents(): void {
    if (!this.events) {
      this.calendarOptions = {
        ...this.calendarOptions,
        events: []
      };
      return;
    }

    const formattedEvents: EventInput[] = this.events.map(event => {
      let startDateTime: Date;
      let endDateTime: Date;

      if (typeof event.start === 'string' && typeof event.end === 'string') {
        // Handle time-based events (shifts)
        const eventDate = new Date(event.start);
        const [startHour, startMinute] = event.start.split('T')[1]?.split(':').map(Number) || [9, 0];
        const [endHour, endMinute] = event.end.split('T')[1]?.split(':').map(Number) || [17, 0];

        startDateTime = new Date(eventDate);
        startDateTime.setHours(startHour, startMinute, 0, 0);

        endDateTime = new Date(eventDate);
        endDateTime.setHours(endHour, endMinute, 0, 0);

        // Handle overnight shifts
        if (endHour < startHour || (endHour === 0 && endMinute === 0)) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
      } else {
        startDateTime = new Date(event.start);
        endDateTime = new Date(event.end);
      }

      return {
        id: event.id,
        title: event.title,
        start: startDateTime,
        end: endDateTime,
        className: event.className || '',
        allDay: event.allDay || false,
        extendedProps: event.extendedProps || {}
      };
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events: formattedEvents
    };
  }

  private handleEventClick(info: any): void {
    this.eventClick.emit({
      event: info.event,
      jsEvent: info.jsEvent,
      view: info.view
    });
  }

  private handleDateSelect(info: any): void {
    this.dateSelect.emit({
      start: info.start,
      end: info.end,
      allDay: info.allDay,
      view: info.view
    });
  }

  private handleEventDrop(info: any): void {
    this.eventDrop.emit({
      event: info.event,
      delta: info.delta,
      revert: info.revert
    });
  }

  private handleEventResize(info: any): void {
    this.eventResize.emit({
      event: info.event,
      startDelta: info.startDelta,
      endDelta: info.endDelta,
      revert: info.revert
    });
  }

  // Public methods for external control
  public scrollToTime(time: string): void {
    this.calendarOptions = {
      ...this.calendarOptions,
      scrollTime: time
    };
  }

  public getCalendarApi(): any {
    const calendarElement = document.querySelector('full-calendar');
    return (calendarElement as any)?.getApi?.();
  }
}
