import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { injectSpeedInsights } from '@vercel/speed-insights';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App implements OnInit {
  title = 'clinical-nutrilev';

  ngOnInit(): void {
    injectSpeedInsights();
  }
}
