import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon';
import { ButtonComponent } from '../../atoms/button/button';

@Component({
  selector: 'app-o-legal-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  template: `
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in" (click)="close.emit()">
        <div class="bg-white dark:bg-[#0a0a0a] w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] shadow-2xl border border-nutri-rose/10 dark:border-white/10 overflow-hidden flex flex-col animate-scale-up" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="p-8 border-b border-nutri-rose/5 dark:border-white/5 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-nutri-rose/10 flex items-center justify-center text-nutri-rose shadow-inner">
                        <app-a-icon [name]="type() === 'privacy' ? 'security' : 'support_agent'"></app-a-icon>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-nutri-text dark:text-slate-200 serif">{{ type() === 'privacy' ? 'Aviso de Privacidad' : 'Soporte Técnico' }}</h2>
                        <p class="text-[10px] font-black text-nutri-rose/50 uppercase tracking-widest">Clinical Nutrilev Intelligence</p>
                    </div>
                </div>
                <app-a-button (onClick)="close.emit()" variant="ghost" icon="close" size="sm" customClass="!rounded-xl"></app-a-button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-8 scroll-premium">
                <div class="prose prose-sm dark:prose-invert max-w-none">
                    @if (type() === 'privacy') {
                        <div class="space-y-6 text-sm text-nutri-text/70 dark:text-slate-400 leading-relaxed">
                            <section>
                                <h3 class="text-nutri-rose font-bold uppercase tracking-widest text-xs mb-2">Responsable del Tratamiento</h3>
                                <p>Clinical Nutrilev, con domicilio en Ciudad de México, es el responsable del tratamiento de sus datos personales, garantizando su seguridad y confidencialidad bajo los más altos estándares de protección.</p>
                            </section>

                            <section>
                                <h3 class="text-nutri-rose font-bold uppercase tracking-widest text-xs mb-2">Datos Personales Recabados</h3>
                                <p>Para brindarle un servicio de asesoría nutricional de precisión, recabamos:</p>
                                <ul class="list-disc pl-5 mt-2 space-y-1">
                                    <li>Datos de identificación (Nombre completo, correo electrónico).</li>
                                    <li>Datos sensibles de salud (Historia clínica, medidas antropométricas, hábitos alimenticios, alergias).</li>
                                </ul>
                            </section>

                            <section>
                                <h3 class="text-nutri-rose font-bold uppercase tracking-widest text-xs mb-2">Finalidades del Tratamiento</h3>
                                <p>Sus datos son utilizados exclusivamente para:</p>
                                <ol class="list-decimal pl-5 mt-2 space-y-1">
                                    <li>Creación y gestión de su expediente clínico digital.</li>
                                    <li>Diseño de planes nutricionales automatizados y personalizados.</li>
                                    <li>Monitoreo de progreso mediante analítica avanzada.</li>
                                </ol>
                            </section>

                            <section class="bg-nutri-rose/5 dark:bg-white/5 p-6 rounded-3xl border border-nutri-rose/10">
                                <h3 class="text-nutri-rose font-bold uppercase tracking-widest text-xs mb-2">Derechos ARCO</h3>
                                <p>Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición en cualquier momento enviando una solicitud formal a <strong>soporte&#64;nutrilev.com</strong>.</p>
                            </section>
                        </div>
                    } @else {
                        <div class="space-y-6 text-sm text-nutri-text/70 dark:text-slate-400 leading-relaxed">
                            <div class="bg-emerald-500/5 dark:bg-emerald-500/10 p-8 rounded-[2rem] border border-emerald-500/10 text-center">
                                <app-a-icon name="help" size="32px" customClass="text-emerald-500 mb-4 mx-auto"></app-a-icon>
                                <h3 class="text-lg font-bold text-nutri-text dark:text-slate-200 serif mb-2">¿Necesitas ayuda?</h3>
                                <p>Nuestro equipo técnico está listo para resolver cualquier inconveniente con la plataforma.</p>
                            </div>

                            <section class="space-y-4">
                                <div class="flex gap-4 items-start">
                                    <div class="w-8 h-8 rounded-lg bg-nutri-rose/10 flex items-center justify-center text-nutri-rose flex-shrink-0 mt-1">
                                        <span class="font-bold">1</span>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-nutri-text dark:text-slate-200">Verifica tu conexión</h4>
                                        <p class="text-xs">Asegúrate de tener una conexión estable a internet para sincronizar tus datos correctamente.</p>
                                    </div>
                                </div>

                                <div class="flex gap-4 items-start">
                                    <div class="w-8 h-8 rounded-lg bg-nutri-rose/10 flex items-center justify-center text-nutri-rose flex-shrink-0 mt-1">
                                        <span class="font-bold">2</span>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-nutri-text dark:text-slate-200">Limpieza de Datos</h4>
                                        <p class="text-xs">Si la app se comporta de forma inesperada, intenta cerrar sesión y volver a entrar o limpiar el caché de tu navegador.</p>
                                    </div>
                                </div>

                                <div class="flex gap-4 items-start">
                                    <div class="w-8 h-8 rounded-lg bg-nutri-rose/10 flex items-center justify-center text-nutri-rose flex-shrink-0 mt-1">
                                        <span class="font-bold">3</span>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-nutri-text dark:text-slate-200">Contacto Directo</h4>
                                        <p class="text-xs">Envía un correo a <span class="text-nutri-rose font-bold">soporte&#64;nutrilev.com</span> con tu nombre y una breve descripción del problema.</p>
                                    </div>
                                </div>
                            </section>

                            <footer class="pt-6 border-t border-nutri-rose/5 dark:border-white/5 text-center">
                                <p class="text-[10px] font-black text-nutri-text/30 dark:text-slate-500 uppercase tracking-widest">Tiempo de respuesta estimado: &lt; 24 Horas</p>
                            </footer>
                        </div>
                    }
                </div>
            </div>

            <!-- Footer -->
            <div class="p-6 bg-nutri-bg/30 dark:bg-white/5 border-t border-nutri-rose/5 dark:border-white/5 flex justify-center">
                <app-a-button (onClick)="close.emit()" label="ENTENDIDO" variant="primary" size="md" customClass="!px-12 !rounded-2xl"></app-a-button>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .scroll-premium::-webkit-scrollbar {
        width: 4px;
    }
    .scroll-premium::-webkit-scrollbar-track {
        background: transparent;
    }
    .scroll-premium::-webkit-scrollbar-thumb {
        background: rgba(216, 27, 96, 0.1);
        border-radius: 10px;
    }
    .dark .scroll-premium::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.05);
    }
  `]
})
export class LegalModalComponent {
  type = input<'privacy' | 'support'>('privacy');
  close = output<void>();
}
