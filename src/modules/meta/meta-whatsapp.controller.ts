import { Controller, Post, Get, Body, Query, Res, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { MetaWhatsAppService } from './meta-whatsapp.service';
import { SendMetaTemplateDto, SendMetaTextDto, SendMetaButtonsDto, SendMetaListDto, MetaMessageResponseDto } from './dto/meta-message.dto';
import { RequireRole, Public } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('meta-whatsapp')
@Controller('meta')
export class MetaWhatsAppController {
  private readonly logger = new Logger(MetaWhatsAppController.name);

  constructor(private readonly metaService: MetaWhatsAppService) {}

  // ── Outgoing messages ─────────────────────────────────────────────────────

  @Post('messages/send-template')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Send a template message to open a 24h session (required before sending interactive messages)' })
  @ApiResponse({ status: 201, description: 'Template sent', type: MetaMessageResponseDto })
  async sendTemplate(@Body() dto: SendMetaTemplateDto): Promise<MetaMessageResponseDto> {
    return this.metaService.sendTemplate(dto.to, dto.templateName, dto.languageCode);
  }

  @Post('messages/send-text')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Send a text message via Meta Cloud API' })
  @ApiResponse({ status: 201, description: 'Message sent', type: MetaMessageResponseDto })
  async sendText(@Body() dto: SendMetaTextDto): Promise<MetaMessageResponseDto> {
    return this.metaService.sendText(dto);
  }

  @Post('messages/send-buttons')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Send interactive button message via Meta Cloud API (2–3 buttons)' })
  @ApiResponse({ status: 201, description: 'Button message sent', type: MetaMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload or Meta API error' })
  async sendButtons(@Body() dto: SendMetaButtonsDto): Promise<MetaMessageResponseDto> {
    return this.metaService.sendButtons(dto);
  }

  @Post('messages/send-list')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Send interactive list picker via Meta Cloud API' })
  @ApiResponse({ status: 201, description: 'List message sent', type: MetaMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload or Meta API error' })
  async sendList(@Body() dto: SendMetaListDto): Promise<MetaMessageResponseDto> {
    return this.metaService.sendList(dto);
  }

  // ── Meta webhook (verification + incoming events) ─────────────────────────

  @Get('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta webhook verification endpoint' })
  @ApiQuery({ name: 'hub.mode', required: false })
  @ApiQuery({ name: 'hub.verify_token', required: false })
  @ApiQuery({ name: 'hub.challenge', required: false })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.metaService.verifyWebhook(mode, token, challenge);
    if (result !== null) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta webhook — receives button replies and incoming messages' })
  async receiveWebhook(@Body() body: any) {
    try {
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      if (!value) return { ok: true };

      const messages = value.messages ?? [];
      for (const msg of messages) {
        const from: string = msg.from;
        const type: string = msg.type;

        if (type === 'interactive') {
          const btnReply = msg.interactive?.button_reply;
          const listReply = msg.interactive?.list_reply;

          if (btnReply) {
            this.logger.log(`Button reply from ${from}: id=${btnReply.id} title="${btnReply.title}"`);
            await this.metaService.handleButtonReply(from, btnReply.id, btnReply.title);
          }
          if (listReply) {
            this.logger.log(`List reply from ${from}: id=${listReply.id} title="${listReply.title}"`);
            await this.metaService.handleListReply(from, listReply.id, listReply.title);
          }
        } else if (type === 'text') {
          const text: string = msg.text?.body ?? '';
          this.logger.log(`Text from ${from}: ${text}`);
          // Any text message → send main menu
          await this.metaService.sendMainMenu(from);
        }
      }

      const statuses = value.statuses ?? [];
      for (const s of statuses) {
        this.logger.log(`Message ${s.id} → ${s.status}`);
      }
    } catch (err) {
      this.logger.error('Error processing Meta webhook', String(err));
    }
    return { ok: true };
  }
}
