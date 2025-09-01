import { Route } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ManagerGuard } from './guards/manager.guard';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FeaturePlaceholderComponent } from './components/feature-placeholder/feature-placeholder.component';
import { EmployeeManagementComponent } from './components/manager/employee-management/employee-management.component';
import { ShiftManagementComponent } from './components/manager/shift-management/shift-management.component';
import { ScheduleManagementComponent } from './components/manager/schedule-management/schedule-management.component';
import { ShiftCalendarManagerComponent } from './components/manager/shift-calendar-manager/shift-calendar-manager.component';
import { RulesManagementComponent } from './components/manager/rules-management/rules-management.component';
import { ShiftCalendarEmployeeComponent } from './components/employee/shift-calendar-employee/shift-calendar-employee.component';
import { ShiftCalendarManagerRefactoredComponent } from './components/manager/shift-calendar-manager/shift-calendar-manager-refactored.component';
import { ShiftCalendarComponent } from './components/employee/shift-calendar/shift-calendar.component';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  // Feature routes - using placeholder components for now
  {
    path: 'employee',
    canActivate: [AuthGuard],
    children: [
      { path: 'schedule', component: ShiftCalendarComponent },
      { path: 'availability', component: FeaturePlaceholderComponent },
      { path: 'timesheet', component: FeaturePlaceholderComponent },
    ],
  },
  {
    path: 'manager',
    canActivate: [AuthGuard, ManagerGuard],
    children: [
      { path: 'employees', component: EmployeeManagementComponent },
      { path: 'shifts', component: ShiftManagementComponent },
      { path: 'schedules', component: ScheduleManagementComponent },
      { path: 'calendar', component: ShiftCalendarManagerComponent },
      { path: 'rules', component: RulesManagementComponent },
      { path: 'timesheets', component: FeaturePlaceholderComponent },
    ],
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, ManagerGuard],
    children: [
      { path: 'managers', component: FeaturePlaceholderComponent },
    ],
  },
  {
    path: 'profile',
    component: FeaturePlaceholderComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
