import { Routes } from '@angular/router';
import { PatientListComponent } from './components/patient-list/patient-list';
import { LoginComponent } from './components/login/login';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: PatientListComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
