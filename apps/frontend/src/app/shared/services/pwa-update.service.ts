import { ApplicationRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { concat, interval } from 'rxjs';
import { first, filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);
  private appRef = inject(ApplicationRef);

  public showUpdateBanner = signal<boolean>(false);

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // Wait for the app to stabilize before checking for updates
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000); // Check every 6 hours
    const checkInterval$ = concat(appIsStable$, everySixHours$);

    checkInterval$.subscribe(async () => {
      try {
        console.log('PWA: Checking for updates in the background...');
        await this.swUpdate.checkForUpdate();
      } catch (err) {
        console.error('PWA: Failed to check for updates:', err);
      }
    });

    // Listen to version update events
    this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
    ).subscribe(evt => {
      console.log(`PWA: New version ready to be activated: ${evt.latestVersion.hash}`);
      this.showUpdateBanner.set(true);
    });
  }

  public activateUpdate() {
    this.showUpdateBanner.set(false);
    // Reload window to apply the update immediately
    window.location.reload();
  }

  public dismissBanner() {
    this.showUpdateBanner.set(false);
  }
}
