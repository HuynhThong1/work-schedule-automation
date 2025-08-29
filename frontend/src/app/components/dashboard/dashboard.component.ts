import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    CardModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;

  private authService = inject(AuthService);

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  get welcomeMessage(): string {
    if (!this.currentUser) return 'Welcome!';

    return `Welcome back, ${this.currentUser.name}!`;
  }

  get roleDescription(): string {
    if (!this.currentUser) return '';

    if (this.currentUser.role === 'employee') {
      return `You are logged in as a ${this.currentUser.type} employee. You can view your schedule, set your availability, and track your timesheet.`;
    } else {
      const level = this.currentUser.type === 'senior' ? 'Senior' : 'Middle';
      return `You are logged in as a ${level} Manager. You have access to employee management, scheduling, and reporting tools.`;
    }
  }
}
