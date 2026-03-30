import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SupabaseService } from './supabase.service';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [SupabaseService, EmailService],
  exports: [SupabaseService, EmailService, HttpModule],
})
export class CommonModule {}
