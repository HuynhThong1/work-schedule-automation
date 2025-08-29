import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { AuthService, User } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MenubarModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  items: MenuItem[] = [];
  currentUser: User | null = null;

  private authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.buildMenu();
    });
  }

  private buildMenu(): void {
    if (!this.currentUser) return;

    this.items = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: '/dashboard'
      }
    ];

    if (this.currentUser.role === 'employee') {
      this.items.push(
        {
          label: 'My Schedule',
          icon: 'pi pi-calendar',
          routerLink: '/employee/schedule'
        },
        {
          label: 'Availability',
          icon: 'pi pi-clock',
          routerLink: '/employee/availability'
        },
        {
          label: 'Timesheet',
          icon: 'pi pi-file',
          routerLink: '/employee/timesheet'
        }
      );
    }

    if (this.currentUser.role === 'manager') {
      this.items.push(
        {
          label: 'Manage',
          icon: 'pi pi-cog',
          items: [
            {
              label: 'Employees',
              icon: 'pi pi-users',
              routerLink: '/manager/employees'
            },
            {
              label: 'Shifts',
              icon: 'pi pi-calendar-plus',
              routerLink: '/manager/shifts'
            },
            {
              label: 'Schedules',
              icon: 'pi pi-calendar',
              routerLink: '/manager/schedules'
            },
            {
              label: 'Calendar View',
              icon: 'pi pi-calendar-times',
              routerLink: '/manager/calendar'
            },
            {
              label: 'Rules',
              icon: 'pi pi-list',
              routerLink: '/manager/rules'
            },
            {
              label: 'Timesheets',
              icon: 'pi pi-file-o',
              routerLink: '/manager/timesheets'
            }
          ]
        }
      );

      if (this.currentUser.type === 'senior') {
        this.items.push({
          label: 'Admin',
          icon: 'pi pi-shield',
          items: [
            {
              label: 'Managers',
              icon: 'pi pi-user-plus',
              routerLink: '/admin/managers'
            }
          ]
        });
      }
    }

    // Add user menu
    this.items.push({
      label: this.currentUser.name,
      icon: 'pi pi-user',
      items: [
        {
          label: 'Profile',
          icon: 'pi pi-user-edit',
          routerLink: '/profile'
        },
        {
          label: 'Logout',
          icon: 'pi pi-sign-out',
          command: () => this.logout()
        }
      ]
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
