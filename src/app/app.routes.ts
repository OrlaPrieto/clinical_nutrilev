import { Routes } from '@angular/router';
import { LoginPage } from './pages/login-page/login-page';
import { PatientListPage } from './pages/patient-list/patient-list';
import { MenuAutomationOrganism } from './shared/components/organisms/menu-automation/menu-automation-organism';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'dashboard', component: PatientListPage, canActivate: [authGuard] },
  { path: 'menu-automation', component: MenuAutomationOrganism, canActivate: [authGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
