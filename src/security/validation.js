/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import * as z from 'zod/v4';
import { DISCORD_LIMITS, ERROR_CODES } from '../core/constants.js';
import { AppError } from '../utils/errors.js';

export const SNOWFLAKE_REGEX = /^\d{17,20}$/;
export const HEX_COLOR_REGEX = /^#?[0-9A-Fa-f]{6}$/;

export const snowflakeSchema = z
  .string()
  .trim()
  .regex(SNOWFLAKE_REGEX, 'Must be a valid Discord Snowflake ID (17-20 digits).');

export const guildIdSchema = snowflakeSchema.describe('Discord Guild (Server) Snowflake ID');
export const channelIdSchema = snowflakeSchema.describe('Discord Channel Snowflake ID');
export const userIdSchema = snowflakeSchema.describe('Discord User/Member Snowflake ID');
export const roleIdSchema = snowflakeSchema.describe('Discord Role Snowflake ID');
export const messageIdSchema = snowflakeSchema.describe('Discord Message Snowflake ID');
export const threadIdSchema = snowflakeSchema.describe('Discord Thread Snowflake ID');
export const emojiIdSchema = snowflakeSchema.describe('Discord Emoji Snowflake ID');
export const stickerIdSchema = snowflakeSchema.describe('Discord Sticker Snowflake ID');
export const webhookIdSchema = snowflakeSchema.describe('Discord Webhook Snowflake ID');
export const eventIdSchema = snowflakeSchema.describe('Discord Scheduled Event Snowflake ID');
export const ruleIdSchema = snowflakeSchema.describe('Discord AutoMod Rule Snowflake ID');
export const commandIdSchema = snowflakeSchema.describe('Discord Application Command Snowflake ID');

export const reasonSchema = z
  .string()
  .trim()
  .max(DISCORD_LIMITS.MAX_REASON_LENGTH, `Audit log reason cannot exceed ${DISCORD_LIMITS.MAX_REASON_LENGTH} characters.`)
  .optional()
  .describe('Optional audit log reason for this operation');

export const confirmationFields = {
  confirm: z
    .boolean()
    .optional()
    .describe('Set to true only after explicit user confirmation of the destructive action'),
  confirmationToken: z
    .string()
    .trim()
    .optional()
    .describe('Single-use confirmation token issued for this exact destructive operation and parameter set')
};

export const hexColorSchema = z
  .union([
    z.string().trim().regex(HEX_COLOR_REGEX, 'Color must be a 6-digit hex color such as #5865F2'),
    z.number().int().min(0).max(0xffffff)
  ])
  .describe('Color as hex string (#RRGGBB) or integer (0 to 16777215)');

export const embedFieldSchema = z.object({
  name: z.string().min(1).max(DISCORD_LIMITS.MAX_EMBED_FIELD_NAME_LENGTH),
  value: z.string().min(1).max(DISCORD_LIMITS.MAX_EMBED_FIELD_VALUE_LENGTH),
  inline: z.boolean().optional()
});

export const embedSchema = z.object({
  title: z.string().max(DISCORD_LIMITS.MAX_EMBED_TITLE_LENGTH).optional(),
  description: z.string().max(DISCORD_LIMITS.MAX_EMBED_DESCRIPTION_LENGTH).optional(),
  url: z.string().url().optional(),
  color: hexColorSchema.optional(),
  timestamp: z.string().optional(),
  footer: z
    .object({
      text: z.string().max(DISCORD_LIMITS.MAX_EMBED_FOOTER_LENGTH),
      iconUrl: z.string().url().optional()
    })
    .optional(),
  author: z
    .object({
      name: z.string().max(DISCORD_LIMITS.MAX_EMBED_AUTHOR_LENGTH),
      url: z.string().url().optional(),
      iconUrl: z.string().url().optional()
    })
    .optional(),
  thumbnailUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  fields: z.array(embedFieldSchema).max(DISCORD_LIMITS.MAX_EMBED_FIELDS).optional()
});

export const allowedMentionsSchema = z
  .object({
    parse: z.array(z.enum(['roles', 'users', 'everyone'])).optional(),
    users: z.array(snowflakeSchema).max(100).optional(),
    roles: z.array(snowflakeSchema).max(100).optional(),
    repliedUser: z.boolean().optional()
  })
  .optional()
  .describe('Controls which mentions are parsed and pinged by Discord');

export function validateInput(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message
    }));
    const summary = issues.map((item) => `${item.path}: ${item.message}`).join('; ');
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      `Input validation failed: ${summary}`,
      { issues }
    );
  }
  return result.data;
}

export function assertValidSnowflake(value, errorCode = ERROR_CODES.VALIDATION_ERROR, label = 'ID') {
  if (typeof value !== 'string' || !SNOWFLAKE_REGEX.test(value.trim())) {
    throw new AppError(
      errorCode,
      `Invalid ${label}: "${String(value)}". Expected a 17-20 digit Discord Snowflake ID.`
    );
  }
  return value.trim();
}

export function parseHexColor(colorInput) {
  if (colorInput === undefined || colorInput === null) {
    return undefined;
  }
  if (typeof colorInput === 'number') {
    if (!Number.isInteger(colorInput) || colorInput < 0 || colorInput > 0xffffff) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Color integer must be between 0 and 16777215.');
    }
    return colorInput;
  }
  if (typeof colorInput === 'string') {
    const trimmed = colorInput.trim();
    if (!HEX_COLOR_REGEX.test(trimmed)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Color string must be a 6-digit hex value (e.g., #5865F2).');
    }
    return parseInt(trimmed.replace(/^#/, ''), 16);
  }
  throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid color value.');
}

export function validateDataUriOrUrl(source, maxBytes = DISCORD_LIMITS.MAX_EMOJI_SIZE_BYTES, allowedFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
  if (typeof source !== 'string' || source.trim().length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Image source must be a non-empty URL or base64 data URI.');
  }

  const trimmed = source.trim();

  if (trimmed.startsWith('data:')) {
    const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(trimmed);
    if (!match) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid data URI format. Allowed image formats: ${allowedFormats.join(', ')}.`
      );
    }
    const format = match[1].toLowerCase();
    if (!allowedFormats.includes(format)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Unsupported image format "${format}". Allowed: ${allowedFormats.join(', ')}.`
      );
    }
    const base64Data = match[2].replace(/[\r\n]/g, '');
    const byteLength = Buffer.byteLength(base64Data, 'base64');
    if (byteLength > maxBytes) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Image payload (${byteLength} bytes) exceeds Discord limit of ${maxBytes} bytes.`
      );
    }
    return Buffer.from(base64Data, 'base64');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Image source must be a valid HTTPS URL or data:image/...;base64 URI.');
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Image URL must use https:// or http:// protocol.');
  }

  return trimmed;
}

