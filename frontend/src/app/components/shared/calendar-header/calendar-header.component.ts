import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CalendarService } from '../../../services/calendar.service';

export interface HeaderAction {
  icon: string;
  label: string;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast';
  loading?: boolean;
  disabled?: boolean;
  badge?: string;
  badgeSeverity?: 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | 'help' | 'primary';
  action: string;
}

@Component({
  selector: 'app-calendar-header',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  template: `
    <div class="calendar-header">
      <div class="header-content">
        <div class="header-info">
          <i [class]="headerIcon" class="text-3xl mr-3"></i>
          <div>
            <h2 class="text-2xl font-bold text-gray-900">{{ title }}</h2>
            <p class="text-gray-600">{{ subtitle }}</p>
          </div>
        </div>

        <div class="header-actions">
          <!-- Main Actions -->
          <div class="action-buttons">
            <p-button
              *ngFor="let action of actions"
              [icon]="action.icon"
              [label]="action.label"
              [severity]="action.severity || 'secondary'"
              [loading]="action.loading"
              [disabled]="action.disabled"
              [badge]="action.badge"
              [badgeSeverity]="action.badgeSeverity"
              styleClass="action-button"
              (onClick)="onActionClick(action.action)">
            </p-button>
          </div>

          <!-- Time Navigation -->
          <div class="time-navigation" *ngIf="showTimeNavigation">
            <div class="nav-divider"></div>
            <div class="time-nav-buttons">
              <p-button
                *ngFor="let slot of timeSlots"
                [icon]="slot.icon"
                severity="secondary"
                size="small"
                styleClass="time-nav-button"
                [pTooltip]="slot.label"
                (onClick)="onTimeNavigate(slot.time)">
              </p-button>
            </div>

            <p-button
              icon="pi pi-info-circle"
              severity="secondary"
              size="small"
              styleClass="time-nav-button"
              pTooltip="Keyboard shortcuts: Ctrl+1-5 for quick time navigation"
              tooltipPosition="bottom">
            </p-button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./calendar-header.component.scss']
})
export class CalendarHeaderComponent implements OnInit {
  @Input() title = 'Calendar';
  @Input() subtitle = 'Manage your schedule';
  @Input() headerIcon = 'pi pi-calendar';
  @Input() actions: HeaderAction[] = [];
  @Input() showTimeNavigation = true;

  @Output() actionClick = new EventEmitter<string>();
  @Output() timeNavigate = new EventEmitter<string>();

  timeSlots: { time: string; label: string; icon: string; }[] = [];

  private calendarService = inject(CalendarService);

  ngOnInit(): void {
    this.timeSlots = this.calendarService.getTimeSlots();
  }

  onActionClick(action: string): void {
    this.actionClick.emit(action);
  }

  onTimeNavigate(time: string): void {
    this.timeNavigate.emit(time);
  }
}
