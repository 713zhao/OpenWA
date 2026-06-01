import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsUrl, ValidateIf, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class SendTextMessageDto {
  @ApiProperty({
    description: 'WhatsApp chat ID (phone@c.us for individual, groupId@g.us for groups)',
    example: '628123456789@c.us',
  })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({
    description: 'Text message content',
    example: 'Hello from OpenWA!',
    maxLength: 4096,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text: string;
}

export class SendMediaMessageDto {
  @ApiProperty({
    description: 'WhatsApp chat ID',
    example: '628123456789@c.us',
  })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiPropertyOptional({
    description: 'Media URL (http/https)',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsUrl()
  @ValidateIf((o: SendMediaMessageDto) => !o.base64)
  url?: string;

  @ApiPropertyOptional({
    description: 'Base64 encoded media data',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o: SendMediaMessageDto) => !o.url)
  base64?: string;

  @ApiPropertyOptional({
    description: 'Media MIME type (required when using base64)',
    example: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  mimetype?: string;

  @ApiPropertyOptional({
    description: 'Filename for the media',
    example: 'image.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;

  @ApiPropertyOptional({
    description: 'Caption for the media',
    example: 'Check out this image!',
    maxLength: 1024,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;
}

export class ButtonItemDto {
  @ApiPropertyOptional({ description: 'Button ID (auto-generated if omitted)', example: 'btn1' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Button label text', example: 'Yes' })
  @IsString()
  @IsNotEmpty()
  body: string;
}

export class SendButtonsMessageDto {
  @ApiProperty({ description: 'WhatsApp chat ID', example: '6586277662@c.us' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ description: 'Main message text', example: 'Please choose an option', maxLength: 4096 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  body: string;

  @ApiProperty({ description: '1–3 buttons', type: [ButtonItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ButtonItemDto)
  buttons: ButtonItemDto[];

  @ApiPropertyOptional({ description: 'Optional header text', example: 'Quick Reply' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Optional footer text', example: 'Powered by OpenWA' })
  @IsOptional()
  @IsString()
  footer?: string;
}

export class ListRowDto {
  @ApiPropertyOptional({ description: 'Row ID (auto-generated if omitted)', example: 'row1' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Row title', example: 'Option 1' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Row description', example: 'Details about this option' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ListSectionDto {
  @ApiPropertyOptional({ description: 'Section title', example: 'Category A' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Section rows', type: [ListRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ListRowDto)
  rows: ListRowDto[];
}

export class SendListMessageDto {
  @ApiProperty({ description: 'WhatsApp chat ID', example: '6586277662@c.us' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ description: 'Message description text', example: 'Please select an item from the list' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ description: 'Label on the list-picker button', example: 'View Options' })
  @IsString()
  @IsNotEmpty()
  buttonText: string;

  @ApiProperty({ description: 'List sections (at least one required)', type: [ListSectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ListSectionDto)
  sections: ListSectionDto[];

  @ApiPropertyOptional({ description: 'Optional header text', example: 'Select a plan' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Optional footer text', example: 'Powered by OpenWA' })
  @IsOptional()
  @IsString()
  footer?: string;
}

export class SendPollMessageDto {
  @ApiProperty({ description: 'WhatsApp chat ID', example: '6593287628@c.us' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ description: 'Poll question', example: 'Which plan suits you?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  question: string;

  @ApiProperty({ description: 'Poll options (2–12)', example: ['Basic', 'Pro', 'Enterprise'], type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  options: string[];

  @ApiPropertyOptional({ description: 'Allow selecting multiple answers', default: false })
  @IsOptional()
  allowMultipleAnswers?: boolean;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'true_628123456789@c.us_3EB0123456789' })
  messageId: string;

  @ApiProperty({ example: 1706868000 })
  timestamp: number;
}
