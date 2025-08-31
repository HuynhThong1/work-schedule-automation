import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MessageService, ConfirmationService } from 'primeng/api';

import { App } from './app/app';
import { appRoutes } from './app/app.routes';

bootstrapApplication(App, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    MessageService,
    ConfirmationService,
  ],
}).catch(err => console.error(err));
