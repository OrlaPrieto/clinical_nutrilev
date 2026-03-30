import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login-page/login-page').then(c => c.LoginPage) 
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./pages/patient-list/patient-list').then(c => c.PatientListPage), 
    canActivate: [roleGuard(['admin'])] 
  },
  { 
    path: 'portal', 
    loadComponent: () => import('./pages/portal-page/portal-page').then(c => c.PortalPage), 
    canActivate: [roleGuard(['patient'])] 
  },
  { 
    path: 'menu-automation', 
    loadComponent: () => import('./shared/components/organisms/menu-automation/menu-automation-organism').then(c => c.MenuAutomationOrganism), 
    canActivate: [roleGuard(['admin'])] 
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
