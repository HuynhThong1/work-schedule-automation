import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CalendarHeaderComponent, HeaderAction } from './calendar-header.component';
import { CalendarService } from '../../../services/calendar.service';

describe('CalendarHeaderComponent', () => {
  let component: CalendarHeaderComponent;
  let fixture: ComponentFixture<CalendarHeaderComponent>;
  let calendarService: jest.Mocked<CalendarService>;

  const mockActions: HeaderAction[] = [
    {
      icon: 'pi pi-refresh',
      label: 'Refresh',
      severity: 'secondary',
      action: 'refresh'
    },
    {
      icon: 'pi pi-cog',
      label: 'Auto Schedule',
      severity: 'success',
      action: 'auto-schedule'
    }
  ];

  const mockTimeSlots = [
    { time: '06:00:00', label: 'Early Morning', icon: 'pi pi-angle-up' },
    { time: '09:00:00', label: 'Morning', icon: 'pi pi-sun' }
  ];

  beforeEach(async () => {
    const calendarServiceSpy = {
      getTimeSlots: jest.fn().mockReturnValue(mockTimeSlots)
    };

    await TestBed.configureTestingModule({
      imports: [CalendarHeaderComponent, ButtonModule, TooltipModule],
      providers: [
        { provide: CalendarService, useValue: calendarServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarHeaderComponent);
    component = fixture.componentInstance;
    calendarService = TestBed.inject(CalendarService) as jest.Mocked<CalendarService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.title).toBe('Calendar');
    expect(component.subtitle).toBe('Manage your schedule');
    expect(component.headerIcon).toBe('pi pi-calendar');
    expect(component.actions).toEqual([]);
    expect(component.showTimeNavigation).toBe(true);
  });

  it('should load time slots from service', () => {
    fixture.detectChanges();

    expect(calendarService.getTimeSlots).toHaveBeenCalled();
    expect(component.timeSlots).toEqual(mockTimeSlots);
  });

  it('should emit actionClick when action button is clicked', () => {
    const emitSpy = jest.spyOn(component.actionClick, 'emit');

    component.onActionClick('refresh');

    expect(emitSpy).toHaveBeenCalledWith('refresh');
  });

  it('should emit timeNavigate when time navigation button is clicked', () => {
    const emitSpy = jest.spyOn(component.timeNavigate, 'emit');

    component.onTimeNavigate('09:00:00');

    expect(emitSpy).toHaveBeenCalledWith('09:00:00');
  });

  it('should handle empty actions array', () => {
    component.actions = [];
    fixture.detectChanges();

    const actionButtons = fixture.nativeElement.querySelectorAll('.action-buttons p-button');
    expect(actionButtons.length).toBe(0);
  });

  it('should apply correct CSS classes', () => {
    fixture.detectChanges();

    const headerElement = fixture.nativeElement.querySelector('.calendar-header');
    expect(headerElement).toBeTruthy();

    const headerContent = fixture.nativeElement.querySelector('.header-content');
    expect(headerContent).toBeTruthy();
  });
});
