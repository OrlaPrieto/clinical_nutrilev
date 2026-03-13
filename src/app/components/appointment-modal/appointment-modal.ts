import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleCalendarService } from '../../services/google-calendar.service';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-nutri-text/40 backdrop-blur-md animate-fade-in" (click)="close()">
      <div class="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-nutri-rose/10 pointer-events-auto animate-scale-up" (click)="$event.stopPropagation()">
        
        <div class="flex flex-col lg:flex-row h-full max-h-[90vh]">
          
          <!-- Column 1: Selection (Calendar & Time) -->
          <div class="flex-1 p-6 lg:p-12 space-y-8 overflow-y-auto border-b lg:border-b-0 lg:border-r border-nutri-rose/5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl lg:text-2xl font-bold serif italic text-nutri-rose">Agendar Cita</h3>
                <p class="text-[9px] font-black text-nutri-text/30 uppercase tracking-[0.2em] mt-1">{{ patientName }}</p>
              </div>
              <button (click)="close()" class="w-10 h-10 rounded-2xl bg-nutri-bg flex items-center justify-center text-nutri-rose hover:bg-nutri-rose hover:text-white transition-all shadow-sm">
                <i class="pi pi-times"></i>
              </button>
            </div>

            <!-- Custom Calendar -->
            <div class="space-y-4">
              <div class="flex items-center justify-between px-2">
                <span class="text-sm font-bold text-nutri-text serif capitalize">{{ currentMonthName }} {{ currentYear }}</span>
                <div class="flex gap-2">
                  <button (click)="changeMonth(-1)" class="w-8 h-8 rounded-xl bg-nutri-bg flex items-center justify-center text-nutri-rose hover:bg-nutri-rose/10 transition-all">
                    <i class="pi pi-chevron-left text-[10px]"></i>
                  </button>
                  <button (click)="changeMonth(1)" class="w-8 h-8 rounded-xl bg-nutri-bg flex items-center justify-center text-nutri-rose hover:bg-nutri-rose/10 transition-all">
                    <i class="pi pi-chevron-right text-[10px]"></i>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-7 gap-1">
                @for (day of ['D', 'L', 'M', 'M', 'J', 'V', 'S']; track day) {
                  <div class="text-center py-2 text-[8px] lg:text-[9px] font-black text-nutri-rose/40 uppercase tracking-widest">
                    {{ day }}
                  </div>
                }
                @for (day of calendarDays; track day.date) {
                  <button (click)="selectDate(day)"
                          [disabled]="day.isPast"
                          class="aspect-square flex flex-col items-center justify-center rounded-xl lg:rounded-2xl transition-all relative group"
                          [ngClass]="{
                            'text-nutri-text/20': !day.isCurrentMonth,
                            'text-nutri-text font-bold': day.isCurrentMonth && !isSelected(day.date),
                            'bg-nutri-rose text-white shadow-lg shadow-nutri-rose/20': isSelected(day.date),
                            'bg-nutri-bg/50 hover:bg-nutri-rose/10': day.isCurrentMonth && !isSelected(day.date) && !day.isPast,
                            'cursor-not-allowed opacity-30': day.isPast
                          }">
                    <span class="text-xs">{{ day.date.getDate() }}</span>
                    @if (day.isToday && !isSelected(day.date)) {
                      <div class="absolute bottom-1.5 lg:bottom-2 w-1 h-1 rounded-full bg-nutri-rose"></div>
                    }
                  </button>
                }
              </div>
            </div>

            <!-- Time Selection -->
            <div class="space-y-4">
              <label class="text-[10px] font-black text-nutri-text/30 uppercase tracking-[0.2em] ml-2">Selecciona un horario</label>
              <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                @for (time of timeSlots; track time) {
                  <button (click)="startTime = time"
                          class="h-11 rounded-xl text-[11px] font-bold transition-all border"
                          [ngClass]="{
                            'bg-nutri-rose text-white border-nutri-rose shadow-md shadow-nutri-rose/10': startTime === time,
                            'bg-white text-nutri-text/60 border-nutri-rose/10 hover:border-nutri-rose/40': startTime !== time
                          }">
                    {{ time }}
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Column 2: Confirmation -->
          <div class="w-full lg:w-[360px] bg-nutri-bg/40 p-6 lg:p-12 space-y-8 flex flex-col justify-between overflow-y-auto">
            <div class="space-y-8">
              <div class="space-y-6">
                <div class="space-y-4">
                  <label class="text-[10px] font-black text-nutri-text/30 uppercase tracking-[0.2em]">Detalles adicionales</label>
                  <div class="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    <div class="relative group">
                      <div class="absolute left-6 top-1/2 -translate-y-1/2 text-nutri-rose/40 pointer-events-none transition-colors group-focus-within:text-nutri-rose">
                         <span class="text-sm font-bold">$</span>
                      </div>
                      <input type="text" [(ngModel)]="cost" placeholder="Costo"
                             class="w-full h-14 bg-white/60 rounded-2xl pl-12 pr-6 border border-white focus:border-nutri-rose/20 outline-none transition-all shadow-sm font-medium text-sm">
                    </div>
                    <div class="relative group">
                      <div class="absolute left-6 top-1/2 -translate-y-1/2 text-nutri-rose/40 pointer-events-none transition-colors group-focus-within:text-nutri-rose">
                         <i class="pi pi-hashtag text-xs"></i>
                      </div>
                      <input type="text" [(ngModel)]="appointmentNumber" placeholder="# Cita"
                             class="w-full h-14 bg-white/60 rounded-2xl pl-12 pr-6 border border-white focus:border-nutri-rose/20 outline-none transition-all shadow-sm font-medium text-sm">
                    </div>
                  </div>
                </div>

                <div class="p-6 bg-white/80 rounded-[2.5rem] border border-white shadow-sm space-y-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-nutri-rose/10 flex items-center justify-center text-nutri-rose">
                      <i class="pi pi-calendar text-sm"></i>
                    </div>
                    <div>
                      <p class="text-[9px] font-black text-nutri-text/30 uppercase tracking-widest">Resumen de Cita</p>
                      <p class="text-xs font-bold text-nutri-text">{{ formattedSelectedDate || 'Fecha no elegida' }}</p>
                    </div>
                  </div>
                  @if (startTime) {
                    <div class="flex items-center gap-3 animate-fade-in">
                      <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <i class="pi pi-clock text-sm"></i>
                      </div>
                      <div>
                        <p class="text-[9px] font-black text-nutri-text/30 uppercase tracking-widest">Hora de Inicio</p>
                        <p class="text-xs font-bold text-nutri-text">{{ startTime }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Alert -->
              @if (errorMessage) {
                <div class="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3 animate-fade-in">
                  <i class="pi pi-exclamation-circle text-rose-500 mt-0.5"></i>
                  <p class="text-[10px] text-rose-600 font-bold leading-relaxed">{{ errorMessage }}</p>
                </div>
              }
            </div>

            <div class="space-y-3 pt-6 lg:pt-0">
              <button (click)="schedule()" [disabled]="loading || !selectedDate || !startTime"
                      class="w-full h-16 rounded-[2rem] bg-nutri-rose text-white font-black text-xs tracking-widest uppercase shadow-xl shadow-nutri-rose/20 hover:bg-nutri-rose/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3">
                <i class="pi" [ngClass]="loading ? 'pi-spin pi-spinner' : 'pi-check-circle'"></i>
                <span>{{ loading ? 'AGENDANDO...' : 'CONFIRMAR CITA' }}</span>
              </button>
              <button (click)="close()" [disabled]="loading"
                      class="w-full h-14 rounded-2xl text-nutri-text/40 font-bold text-[10px] tracking-widest uppercase hover:text-nutri-rose transition-all">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-scale-up { animation: scaleUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .scroll-premium::-webkit-scrollbar { width: 4px; }
    .scroll-premium::-webkit-scrollbar-track { background: transparent; }
    .scroll-premium::-webkit-scrollbar-thumb { background: rgba(235, 126, 122, 0.1); border-radius: 10px; }
    .scroll-premium::-webkit-scrollbar-thumb:hover { background: rgba(235, 126, 122, 0.2); }
  `]
})
export class AppointmentModalComponent implements OnInit {
  @Input() patientName: string = '';
  @Input() patientEmail: string = '';
  @Output() onScheduled = new EventEmitter<any>();
  @Output() onClosed = new EventEmitter<void>();

  // State
  viewDate: Date = new Date();
  selectedDate: string = '';
  startTime: string = '';
  cost: string = '';
  appointmentNumber: string = '';
  loading: boolean = false;
  errorMessage: string | null = null;
  
  calendarDays: CalendarDay[] = [];
  timeSlots: string[] = [];

  constructor(private calendarService: GoogleCalendarService) {}

  ngOnInit() {
    this.generateCalendar();
    this.generateTimeSlots();
  }

  get currentMonthName(): string {
    return this.viewDate.toLocaleString('es-ES', { month: 'long' });
  }

  get currentYear(): number {
    return this.viewDate.getFullYear();
  }

  get formattedSelectedDate(): string {
    if (!this.selectedDate) return '';
    const date = new Date(this.selectedDate + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  generateCalendar() {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const days: CalendarDay[] = [];
    
    // Previous month padding
    const firstDayDayOfWeek = firstDayOfMonth.getDay();
    for (let i = firstDayDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(this.createCalendarDay(date, false));
    }
    
    // Current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push(this.createCalendarDay(date, true));
    }
    
    // Next month padding
    const remainingDays = 42 - days.length; // Always show 6 weeks
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(this.createCalendarDay(date, false));
    }
    
    this.calendarDays = days;
  }

  createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return {
      date,
      isCurrentMonth,
      isToday: checkDate.getTime() === today.getTime(),
      isPast: checkDate.getTime() < today.getTime()
    };
  }

  generateTimeSlots() {
    const slots = [];
    for (let hour = 7; hour <= 20; hour++) {
      const h = hour.toString().padStart(2, '0');
      slots.push(`${h}:00`);
      if (hour < 20) slots.push(`${h}:30`);
    }
    this.timeSlots = slots;
  }

  changeMonth(delta: number) {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + delta, 1);
    this.generateCalendar();
  }

  selectDate(day: CalendarDay) {
    if (day.isPast) return;
    
    // Format to YYYY-MM-DD for consistency
    const offset = day.date.getTimezoneOffset();
    const adjustedDate = new Date(day.date.getTime() - (offset * 60 * 1000));
    this.selectedDate = adjustedDate.toISOString().split('T')[0];
    
    if (!day.isCurrentMonth) {
      this.viewDate = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
      this.generateCalendar();
    }
  }

  isSelected(date: Date): boolean {
    if (!this.selectedDate) return false;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const selected = new Date(this.selectedDate + 'T00:00:00');
    selected.setHours(0, 0, 0, 0);
    return checkDate.getTime() === selected.getTime();
  }

  close() {
    if (!this.loading) {
      this.onClosed.emit();
    }
  }

  schedule() {
    if (!this.selectedDate || !this.startTime) return;

    this.loading = true;
    this.errorMessage = null;

    const startDateTime = `${this.selectedDate}T${this.startTime}:00`;
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000); // 45 min duration

    this.calendarService.createEvent(
      this.patientName,
      this.patientEmail,
      startDate.toISOString(),
      endDate.toISOString(),
      this.cost,
      this.appointmentNumber
    ).subscribe({
      next: (res) => {
        this.loading = false;
        this.onScheduled.emit(res);
      },
      error: (err) => {
        console.error('Error scheduling appointment', err);
        this.loading = false;
        if (err.status === 401) {
          this.errorMessage = 'Tu sesión ha expirado o no tienes permisos. Vuelve a iniciar sesión.';
        } else {
          this.errorMessage = 'Error de conexión. Inténtalo de nuevo.';
        }
      }
    });
  }
}
