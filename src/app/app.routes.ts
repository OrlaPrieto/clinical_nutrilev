import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login-page/login-page').then(c => c.LoginPage) 
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./pages/patient-list/patient-list').then(c => c.PatientListPage), 
    canActivate: [authGuard] 
  },
  { 
    path: 'menu-automation', 
    loadComponent: () => import('./shared/components/organisms/menu-automation/menu-automation-organism').then(c => c.MenuAutomationOrganism), 
    canActivate: [authGuard] 
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
