import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SupabaseService } from './supabase.service';
import { EmailService } from './email.service';
import { StorageService } from './services/storage.service';
import { AiGatewayService } from './services/ai-gateway.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [SupabaseService, EmailService, StorageService, AiGatewayService],
  exports: [SupabaseService, EmailService, StorageService, AiGatewayService, HttpModule],
})
export class CommonModule {}
