import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, ArrayMinSize, ArrayMaxSize, ValidateNested, MaxLength, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class MetaButtonDto {
  @ApiProperty({ description: 'Unique button ID', example: 'btn_yes' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Button label (max 20 chars)', example: 'Yes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  title: string;
}

export class MetaListRowDto {
  @ApiProperty({ description: 'Row ID', example: 'row_1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Row title (max 24 chars)', example: 'Option 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  title: string;

  @ApiPropertyOptional({ description: 'Row description (max 72 chars)', example: 'Details about this option' })
  @IsOptional()
  @IsString()
  @MaxLength(72)
  description?: string;
}

export class MetaListSectionDto {
  @ApiPropertyOptional({ description: 'Section title', example: 'Category A' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Section rows', type: [MetaListRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MetaListRowDto)
  rows: MetaListRowDto[];
}

export class SendMetaTemplateDto {
  @ApiProperty({ description: 'Recipient phone number (with country code, no +)', example: '6593287628' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Template name', example: 'hello_world' })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiPropertyOptional({ description: 'Language code', default: 'en_US', example: 'en_US' })
  @IsOptional()
  @IsString()
  languageCode?: string;
}

export class SendMetaTextDto {
  @ApiProperty({ description: 'Recipient phone number (with country code, no +)', example: '6593287628' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Message text', example: 'Hello from Meta API!' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ description: 'Enable link preview', default: true })
  @IsOptional()
  @IsBoolean()
  previewUrl?: boolean;
}

export class SendMetaButtonsDto {
  @ApiProperty({ description: 'Recipient phone number (with country code, no +)', example: '6593287628' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Main message body', example: 'How can we help you today?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  body: string;

  @ApiProperty({ description: '2–3 reply buttons', type: [MetaButtonDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => MetaButtonDto)
  buttons: MetaButtonDto[];

  @ApiPropertyOptional({ description: 'Header text', example: 'Support Options' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  header?: string;

  @ApiPropertyOptional({ description: 'Footer text', example: 'Powered by OpenWA' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  footer?: string;
}

export class SendMetaListDto {
  @ApiProperty({ description: 'Recipient phone number (with country code, no +)', example: '6593287628' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Main message body', example: 'Please select a plan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  body: string;

  @ApiProperty({ description: 'Button label that opens the list', example: 'View Options' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  buttonText: string;

  @ApiProperty({ description: 'List sections (1–10)', type: [MetaListSectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MetaListSectionDto)
  sections: MetaListSectionDto[];

  @ApiPropertyOptional({ description: 'Header text', example: 'Choose a Plan' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  header?: string;

  @ApiPropertyOptional({ description: 'Footer text', example: 'Powered by OpenWA' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  footer?: string;
}

export class MetaMessageResponseDto {
  @ApiProperty({ example: 'wamid.xxx' })
  messageId: string;

  @ApiProperty({ example: '6593287628' })
  to: string;

  @ApiProperty({ example: 'sent' })
  status: string;
}
