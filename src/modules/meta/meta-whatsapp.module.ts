import { Module } from '@nestjs/common';
import { MetaWhatsAppService } from './meta-whatsapp.service';
import { MetaWhatsAppController } from './meta-whatsapp.controller';

@Module({
  controllers: [MetaWhatsAppController],
  providers: [MetaWhatsAppService],
  exports: [MetaWhatsAppService],
})
export class MetaWhatsAppModule {}
