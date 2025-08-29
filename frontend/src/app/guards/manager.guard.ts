import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ManagerGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (this.authService.isLoggedIn() && this.authService.isManager()) {
      return true;
    } else {
      this.router.navigate(['/dashboard']);
      return false;
    }
  }
}
