import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CalendarComponent } from '../../atoms/calendar/calendar';
import { SelectComponent } from '../../atoms/select/select';
import { IconComponent } from '../../atoms/icon/icon';
import { InputComponent } from '../../atoms/input/input';
import { ButtonComponent } from '../../atoms/button/button';

@Component({
  selector: 'app-o-appointment-calendar',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatIconModule,
    CalendarComponent,
    SelectComponent,
    IconComponent,
    InputComponent,
    ButtonComponent
  ],
  templateUrl: './appointment-calendar.html',
  styleUrl: './appointment-calendar.css',
  changeDetection: ChangeDetectionStrategy.Default
})
export class AppointmentCalendarOrganism {
  private cdr = inject(ChangeDetectorRef);

  @Input() patientName: string = '';
  @Input() loading: boolean = false;
  @Input() errorMessage: string | null = null;

  @Output() scheduled = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  // Form State
  selectedDate: Date | null = null;
  startTime: string = '';
  endTime: string = '';
  cost: string = '450';
  appointmentNumber: string = '1/3';

  // Time options (7:00 AM to 8:00 PM)
  timeSlots: {label: string, value: string}[] = this.generateTimeSlots();

  generateTimeSlots(): {label: string, value: string}[] {
    const slots = [];
    for (let hour = 7; hour <= 20; hour++) {
      const h = hour.toString().padStart(2, '0');
      slots.push({label: `${h}:00`, value: `${h}:00`});
      if (hour < 20) slots.push({label: `${h}:30`, value: `${h}:30`});
    }
    return slots;
  }

  get isFormValid(): boolean {
    return !!this.selectedDate && !!this.startTime && !!this.endTime && !!this.cost;
  }

  get formattedDate(): string {
    if (!this.selectedDate) return '';
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const dayName = days[this.selectedDate.getDay()];
    const day = this.selectedDate.getDate();
    const month = months[this.selectedDate.getMonth()];
    const year = this.selectedDate.getFullYear();
    
    return `${dayName}, ${day} de ${month} ${year}`;
  }

  get selectionSummary(): string {
    if (!this.selectedDate || !this.startTime) return 'Selecciona fecha y hora';
    let summary = `${this.formattedDate} a las ${this.startTime}`;
    if (this.endTime) summary += ` hasta las ${this.endTime}`;
    return summary;
  }

  onSchedule() {
    if (!this.selectedDate) return;

    // Adjust date to ISO string format (YYYY-MM-DD)
    const year = this.selectedDate.getFullYear();
    const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = this.selectedDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    this.scheduled.emit({
      selectedDate: formattedDate,
      startTime: this.startTime,
      endTime: this.endTime,
      cost: this.cost,
      appointmentNumber: this.appointmentNumber
    });
  }
}
