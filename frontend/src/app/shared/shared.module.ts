import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { MenubarModule } from 'primeng/menubar';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

const PRIMENG_MODULES = [
  ButtonModule,
  InputTextModule,
  CardModule,
  MenubarModule,
  ToastModule,
  TableModule,
  DialogModule,
  ConfirmDialogModule,
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...PRIMENG_MODULES,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TitleCasePipe,
    ...PRIMENG_MODULES,
  ],
})
export class SharedModule {}
