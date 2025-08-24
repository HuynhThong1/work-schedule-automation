import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { NavbarComponent } from './components/layout/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  protected title = 'frontend';

  constructor(public authService: AuthService) {}
}
