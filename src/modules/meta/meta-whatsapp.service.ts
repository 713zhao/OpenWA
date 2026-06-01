import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMetaTextDto, SendMetaButtonsDto, SendMetaListDto, MetaMessageResponseDto } from './dto/meta-message.dto';

const META_API_VERSION = 'v25.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

@Injectable()
export class MetaWhatsAppService {
  private readonly logger = new Logger(MetaWhatsAppService.name);
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('WHATSAPP_BUSINESS_TOKEN', '');
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
  }

  private async callApi(body: object): Promise<any> {
    const url = `${META_API_BASE}/${this.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = await res.json() as any;
    if (!res.ok) {
      const errMsg = json?.error?.message || `Meta API error ${res.status}`;
      this.logger.error(`Meta API call failed: ${errMsg}`, JSON.stringify(json));
      throw new BadRequestException(errMsg);
    }
    return json;
  }

  private toResponse(json: any, to: string): MetaMessageResponseDto {
    return {
      messageId: json?.messages?.[0]?.id ?? '',
      to,
      status: json?.messages?.[0]?.message_status ?? 'sent',
    };
  }

  async sendTemplate(to: string, templateName: string, languageCode = 'en_US'): Promise<MetaMessageResponseDto> {
    const json = await this.callApi({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    });
    return this.toResponse(json, to);
  }

  async sendText(dto: SendMetaTextDto): Promise<MetaMessageResponseDto> {
    const json = await this.callApi({
      messaging_product: 'whatsapp',
      to: dto.to,
      type: 'text',
      text: {
        body: dto.text,
        preview_url: dto.previewUrl ?? true,
      },
    });
    return this.toResponse(json, dto.to);
  }

  async sendButtons(dto: SendMetaButtonsDto): Promise<MetaMessageResponseDto> {
    const json = await this.callApi({
      messaging_product: 'whatsapp',
      to: dto.to,
      type: 'interactive',
      interactive: {
        type: 'button',
        ...(dto.header && { header: { type: 'text', text: dto.header } }),
        body: { text: dto.body },
        ...(dto.footer && { footer: { text: dto.footer } }),
        action: {
          buttons: dto.buttons.map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
    return this.toResponse(json, dto.to);
  }

  async sendList(dto: SendMetaListDto): Promise<MetaMessageResponseDto> {
    const json = await this.callApi({
      messaging_product: 'whatsapp',
      to: dto.to,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(dto.header && { header: { type: 'text', text: dto.header } }),
        body: { text: dto.body },
        ...(dto.footer && { footer: { text: dto.footer } }),
        action: {
          button: dto.buttonText,
          sections: dto.sections.map(s => ({
            ...(s.title && { title: s.title }),
            rows: s.rows.map(r => ({
              id: r.id,
              title: r.title,
              ...(r.description && { description: r.description }),
            })),
          })),
        },
      },
    });
    return this.toResponse(json, dto.to);
  }

  async sendMainMenu(to: string): Promise<void> {
    await this.sendButtons({
      to,
      header: '🤖 FlowBot Menu',
      body: 'How can we help you today? Please choose an option:',
      footer: 'Powered by FlowBot',
      buttons: [
        { id: 'menu_support', title: '🛠 Support' },
        { id: 'menu_plans', title: '📋 View Plans' },
        { id: 'menu_contact', title: '📞 Contact Us' },
      ],
    });
  }

  private async sendWithBackButton(to: string, header: string, body: string): Promise<void> {
    await this.sendButtons({
      to,
      header,
      body,
      footer: 'Powered by FlowBot',
      buttons: [{ id: 'back_main', title: '🏠 Main Menu' }],
    });
  }

  async handleButtonReply(to: string, id: string, _title: string): Promise<void> {
    switch (id) {
      case 'menu_support':
        await this.sendWithBackButton(
          to,
          '🛠 Support',
          'Our support team is available Mon–Fri, 9am–6pm SGT.\n\nFor urgent issues email us at support@flowbot.com',
        );
        break;

      case 'menu_plans':
        await this.sendList({
          to,
          header: '📋 Our Plans',
          body: 'Select a plan to learn more:',
          buttonText: 'View Plans',
          footer: 'Powered by FlowBot',
          sections: [
            {
              title: 'Basic',
              rows: [
                { id: 'plan_free', title: 'Free', description: '100 messages/day — no cost' },
                { id: 'plan_starter', title: 'Starter', description: '1,000 messages/day — $9/mo' },
              ],
            },
            {
              title: 'Pro',
              rows: [
                { id: 'plan_pro', title: 'Pro', description: '10,000 messages/day — $29/mo' },
                { id: 'plan_enterprise', title: 'Enterprise', description: 'Unlimited — contact us' },
              ],
            },
          ],
        });
        break;

      case 'menu_contact':
        await this.sendWithBackButton(
          to,
          '📞 Contact Us',
          '• Email: hello@flowbot.com\n• Phone: +65 6123 4567\n• Hours: Mon–Fri, 9am–6pm SGT',
        );
        break;

      case 'back_main':
      default:
        await this.sendMainMenu(to);
    }
  }

  async handleListReply(to: string, id: string, title: string): Promise<void> {
    const planDetails: Record<string, string> = {
      plan_free: '• 100 messages/day\n• Basic webhook support\n• Community support\n\nNo credit card needed. Sign up at flowbot.com',
      plan_starter: '• 1,000 messages/day\n• Webhook + API access\n• Email support\n\nStart your free 14-day trial at flowbot.com',
      plan_pro: '• 10,000 messages/day\n• Full API + analytics\n• Priority support\n\nStart your free 14-day trial at flowbot.com',
      plan_enterprise: '• Unlimited messages\n• Dedicated account manager\n• SLA guarantee\n\nContact us at hello@flowbot.com for pricing.',
    };
    const planHeaders: Record<string, string> = {
      plan_free: '🆓 Free Plan',
      plan_starter: '🚀 Starter — $9/mo',
      plan_pro: '💼 Pro — $29/mo',
      plan_enterprise: '🏢 Enterprise',
    };
    await this.sendWithBackButton(
      to,
      planHeaders[id] ?? title,
      planDetails[id] ?? `You selected: ${title}`,
    );
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'openwa-verify-token');
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }
}
