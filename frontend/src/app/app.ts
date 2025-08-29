import { Component, inject } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  protected title = 'frontend';

  public authService = inject(AuthService);
}
