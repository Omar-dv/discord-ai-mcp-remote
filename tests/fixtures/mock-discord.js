/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import {
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
  AuditLogEvent
} from 'discord.js';

function createCollection(entries = []) {
  const map = new Map(entries);
  map.find = (predicate) => {
    for (const [key, val] of map.entries()) {
      if (predicate(val, key, map)) {
        return val;
      }
    }
    return undefined;
  };
  map.filter = (predicate) => {
    const filtered = [];
    for (const [key, val] of map.entries()) {
      if (predicate(val, key, map)) {
        filtered.push([key, val]);
      }
    }
    return createCollection(filtered);
  };
  return map;
}

export const TEST_IDS = Object.freeze({
  BOT_USER_ID: '111111111111111111',
  OWNER_USER_ID: '222222222222222222',
  ADMIN_USER_ID: '333333333333333333',
  MEMBER_USER_ID: '444444444444444444',
  GUILD_ID: '555555555555555555',
  CATEGORY_ID: '666666666666666661',
  TEXT_CHANNEL_ID: '666666666666666662',
  VOICE_CHANNEL_ID: '666666666666666663',
  VOICE_CHANNEL_2_ID: '666666666666666664',
  THREAD_ID: '666666666666666665',
  ANNOUNCEMENT_CHANNEL_ID: '666666666666666666',
  EVERYONE_ROLE_ID: '555555555555555555',
  MEMBER_ROLE_ID: '777777777777777771',
  BOT_ROLE_ID: '777777777777777775',
  HIGH_ADMIN_ROLE_ID: '777777777777777779',
  MANAGED_ROLE_ID: '777777777777777780',
  MESSAGE_ID: '888888888888888881',
  MESSAGE_2_ID: '888888888888888882',
  EMOJI_ID: '999999999999999991',
  STICKER_ID: '999999999999999992',
  WEBHOOK_ID: '999999999999999993',
  EVENT_ID: '999999999999999994',
  AUTOMOD_RULE_ID: '999999999999999995',
  AUDIT_ENTRY_ID: '999999999999999996',
  COMMAND_ID: '999999999999999997'
});

export function createMockDiscordClient() {
  const now = new Date('2026-11-01T12:00:00.000Z');

  const botPermissions = new PermissionsBitField([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageGuildExpressions,
    PermissionFlagsBits.ManageEvents,
    PermissionFlagsBits.ManageThreads,
    PermissionFlagsBits.CreatePublicThreads,
    PermissionFlagsBits.CreatePrivateThreads,
    PermissionFlagsBits.SendMessagesInThreads,
    PermissionFlagsBits.CreateInstantInvite,
    PermissionFlagsBits.ChangeNickname,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.SetVoiceChannelStatus,
    PermissionFlagsBits.ViewAuditLog
  ]);

  const everyoneRole = {
    id: TEST_IDS.EVERYONE_ROLE_ID,
    name: '@everyone',
    color: 0,
    hexColor: '#000000',
    hoist: false,
    position: 0,
    managed: false,
    mentionable: false,
    permissions: new PermissionsBitField([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages
    ]),
    members: new Map(),
    createdAt: now,
    async edit(data) {
      Object.assign(this, data);
      return this;
    }
  };

  const memberRole = {
    id: TEST_IDS.MEMBER_ROLE_ID,
    name: 'Community Member',
    color: 0x5865f2,
    hexColor: '#5865f2',
    hoist: true,
    position: 2,
    managed: false,
    mentionable: true,
    permissions: new PermissionsBitField([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages
    ]),
    members: new Map(),
    createdAt: now,
    async edit(data) {
      Object.assign(this, data);
      return this;
    },
    async setPosition(pos) {
      this.position = pos;
      return this;
    },
    async delete() {
      return this;
    }
  };

  const botRole = {
    id: TEST_IDS.BOT_ROLE_ID,
    name: 'Discord AI MCP Bot',
    color: 0x57f287,
    hexColor: '#57f287',
    hoist: false,
    position: 10,
    managed: false,
    mentionable: false,
    permissions: botPermissions,
    members: new Map(),
    createdAt: now
  };

  const highAdminRole = {
    id: TEST_IDS.HIGH_ADMIN_ROLE_ID,
    name: 'Head Admin',
    color: 0xed4245,
    hexColor: '#ed4245',
    hoist: true,
    position: 20,
    managed: false,
    mentionable: false,
    permissions: new PermissionsBitField([PermissionFlagsBits.Administrator]),
    members: new Map(),
    createdAt: now
  };

  const managedRole = {
    id: TEST_IDS.MANAGED_ROLE_ID,
    name: 'Integration Role',
    color: 0,
    hexColor: '#000000',
    hoist: false,
    position: 3,
    managed: true,
    mentionable: false,
    permissions: new PermissionsBitField([]),
    members: new Map(),
    createdAt: now
  };

  const botUser = {
    id: TEST_IDS.BOT_USER_ID,
    username: 'DiscordAIMCP',
    globalName: 'Discord AI MCP',
    discriminator: '0',
    tag: 'DiscordAIMCP#0000',
    bot: true,
    system: false,
    createdAt: now,
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
    presence: {
      status: 'online',
      activities: [{ name: 'EnzoCord MCP', type: 0, state: 'Managing servers' }]
    }
  };

  const ownerUser = {
    id: TEST_IDS.OWNER_USER_ID,
    username: 'omar_elsabbagh',
    globalName: 'Omar ElSabbagh',
    discriminator: '0',
    tag: 'omar_elsabbagh',
    bot: false,
    system: false,
    createdAt: now,
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/1.png'
  };

  const regularUser = {
    id: TEST_IDS.MEMBER_USER_ID,
    username: 'test_member',
    globalName: 'Test Member',
    discriminator: '0',
    tag: 'test_member',
    bot: false,
    system: false,
    createdAt: now,
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/2.png',
    async fetch() {
      return this;
    }
  };

  const adminUser = {
    id: TEST_IDS.ADMIN_USER_ID,
    username: 'senior_admin',
    globalName: 'Senior Admin',
    discriminator: '0',
    tag: 'senior_admin',
    bot: false,
    system: false,
    createdAt: now,
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/3.png'
  };

  const guild = {
    id: TEST_IDS.GUILD_ID,
    name: 'EnzoCord Official Test Server',
    description: 'Official test server for Discord AI MCP',
    ownerId: TEST_IDS.OWNER_USER_ID,
    memberCount: 4,
    preferredLocale: 'en-US',
    verificationLevel: 2,
    explicitContentFilter: 2,
    defaultMessageNotifications: 1,
    mfaLevel: 1,
    nsfwLevel: 0,
    premiumTier: 2,
    premiumSubscriptionCount: 7,
    systemChannelId: TEST_IDS.TEXT_CHANNEL_ID,
    rulesChannelId: TEST_IDS.TEXT_CHANNEL_ID,
    features: ['COMMUNITY', 'AUTO_MODERATION', 'NEWS'],
    createdAt: now,
    available: true,
    iconURL: () => 'https://cdn.discordapp.com/icons/555555555555555555/icon.png'
  };

  everyoneRole.guild = guild;
  memberRole.guild = guild;
  botRole.guild = guild;
  highAdminRole.guild = guild;
  managedRole.guild = guild;

  const botMember = {
    id: TEST_IDS.BOT_USER_ID,
    guild,
    user: botUser,
    nickname: null,
    displayName: 'Discord AI MCP',
    joinedAt: now,
    permissions: botPermissions,
    roles: {
      highest: botRole,
      cache: createCollection([
        [everyoneRole.id, everyoneRole],
        [botRole.id, botRole]
      ])
    },
    voice: {
      guild,
      id: TEST_IDS.BOT_USER_ID,
      channelId: null
    },
    async setNickname(nick) {
      this.nickname = nick;
      return this;
    }
  };

  const ownerMember = {
    id: TEST_IDS.OWNER_USER_ID,
    guild,
    user: ownerUser,
    nickname: 'Creator',
    displayName: 'Omar ElSabbagh',
    joinedAt: now,
    permissions: new PermissionsBitField([PermissionFlagsBits.Administrator]),
    roles: {
      highest: highAdminRole,
      cache: createCollection([
        [everyoneRole.id, everyoneRole],
        [highAdminRole.id, highAdminRole]
      ])
    },
    voice: {
      guild,
      id: TEST_IDS.OWNER_USER_ID,
      channelId: null
    }
  };

  const adminMember = {
    id: TEST_IDS.ADMIN_USER_ID,
    guild,
    user: adminUser,
    nickname: null,
    displayName: 'Senior Admin',
    joinedAt: now,
    permissions: new PermissionsBitField([PermissionFlagsBits.Administrator]),
    roles: {
      highest: highAdminRole,
      cache: createCollection([
        [everyoneRole.id, everyoneRole],
        [highAdminRole.id, highAdminRole]
      ])
    },
    voice: {
      guild,
      id: TEST_IDS.ADMIN_USER_ID,
      channelId: null
    }
  };

  const regularMemberRolesCache = createCollection([
    [everyoneRole.id, everyoneRole],
    [memberRole.id, memberRole]
  ]);

  const regularMember = {
    id: TEST_IDS.MEMBER_USER_ID,
    guild,
    user: regularUser,
    nickname: 'MemberNick',
    displayName: 'MemberNick',
    joinedAt: now,
    joinedTimestamp: now.getTime(),
    manageable: true,
    kickable: true,
    bannable: true,
    moderatable: true,
    permissions: new PermissionsBitField([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages
    ]),
    roles: {
      highest: memberRole,
      cache: regularMemberRolesCache,
      async add(role) {
        regularMemberRolesCache.set(role.id, role);
        return regularMember;
      },
      async remove(role) {
        regularMemberRolesCache.delete(role.id);
        return regularMember;
      }
    },
    voice: {
      guild,
      id: TEST_IDS.MEMBER_USER_ID,
      channelId: TEST_IDS.VOICE_CHANNEL_ID,
      channel: { id: TEST_IDS.VOICE_CHANNEL_ID, name: 'General Voice' },
      serverDeaf: false,
      serverMute: false,
      selfDeaf: false,
      selfMute: true,
      async setChannel(target) {
        this.channelId = target.id;
        this.channel = target;
        return regularMember;
      },
      async disconnect() {
        this.channelId = null;
        this.channel = null;
        return regularMember;
      }
    },
    presence: {
      status: 'online',
      clientStatus: { desktop: 'online' },
      activities: [{ name: 'Visual Studio Code', type: 0 }]
    },
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/2.png',
    avatarURL: () => null,
    async setNickname(nick) {
      this.nickname = nick;
      return this;
    },
    async timeout(durationMs) {
      this.communicationDisabledUntil = durationMs
        ? new Date(Date.now() + durationMs)
        : null;
      return this;
    },
    async kick() {
      return this;
    }
  };

  memberRole.members.set(regularMember.id, regularMember);

  const mockMessage = {
    id: TEST_IDS.MESSAGE_ID,
    channelId: TEST_IDS.TEXT_CHANNEL_ID,
    guildId: TEST_IDS.GUILD_ID,
    author: botUser,
    content: 'Welcome to EnzoCord!',
    createdAt: now,
    pinned: false,
    tts: false,
    system: false,
    attachments: new Map(),
    embeds: [],
    reactions: {
      cache: createCollection([
        [
          '👍',
          {
            emoji: { name: '👍', id: null },
            count: 2,
            me: true,
            users: {
              async fetch() {
                return createCollection([[botUser.id, botUser]]);
              },
              async remove() {
                return true;
              }
            }
          }
        ]
      ]),
      resolve(emoji) {
        return this.cache.get(emoji);
      }
    },
    async edit(payload) {
      if (payload.content !== undefined) {
        this.content = payload.content;
      }
      if (payload.embeds !== undefined) {
        this.embeds = payload.embeds;
      }
      return this;
    },
    async delete() {
      return this;
    },
    async pin() {
      this.pinned = true;
      return this;
    },
    async unpin() {
      this.pinned = false;
      return this;
    },
    async react() {
      return true;
    },
    async crosspost() {
      return this;
    },
    async startThread({ name, autoArchiveDuration }) {
      return {
        ...threadChannel,
        name,
        autoArchiveDuration
      };
    }
  };

  const mockMessage2 = {
    ...mockMessage,
    id: TEST_IDS.MESSAGE_2_ID,
    content: 'Second test message'
  };

  const categoryChannel = {
    id: TEST_IDS.CATEGORY_ID,
    guildId: TEST_IDS.GUILD_ID,
    guild,
    name: 'Community Channels',
    type: ChannelType.GuildCategory,
    parentId: null,
    position: 0,
    rawPosition: 0,
    createdAt: now,
    permissionOverwrites: {
      cache: createCollection([])
    },
    permissionsFor: () => botPermissions,
    isThread: () => false
  };

  const overwritesMap = createCollection([
    [
      everyoneRole.id,
      {
        id: everyoneRole.id,
        type: 0,
        allow: new PermissionsBitField([PermissionFlagsBits.ViewChannel]),
        deny: new PermissionsBitField([])
      }
    ]
  ]);

  const mockInvite = {
    code: 'enzocord123',
    url: 'https://discord.gg/enzocord123',
    guild,
    channelId: TEST_IDS.TEXT_CHANNEL_ID,
    channel: { id: TEST_IDS.TEXT_CHANNEL_ID, name: 'general' },
    inviter: ownerUser,
    uses: 5,
    maxUses: 100,
    maxAge: 86400,
    temporary: false,
    createdAt: now,
    async delete() {
      return this;
    }
  };

  const mockWebhook = {
    id: TEST_IDS.WEBHOOK_ID,
    guildId: TEST_IDS.GUILD_ID,
    channelId: TEST_IDS.TEXT_CHANNEL_ID,
    name: 'Announcements Webhook',
    type: 1,
    token: 'super_secret_webhook_token_value_1234567890',
    owner: ownerUser,
    createdAt: now,
    avatarURL: () => null,
    async edit(data) {
      if (data.name) {
        this.name = data.name;
      }
      return this;
    },
    async delete() {
      return this;
    },
    async send(payload) {
      return {
        ...mockMessage,
        content: payload.content || ''
      };
    }
  };

  const threadChannel = {
    id: TEST_IDS.THREAD_ID,
    guildId: TEST_IDS.GUILD_ID,
    guild,
    parentId: TEST_IDS.TEXT_CHANNEL_ID,
    ownerId: TEST_IDS.BOT_USER_ID,
    name: 'Release Discussion Thread',
    type: ChannelType.PublicThread,
    archived: false,
    autoArchiveDuration: 1440,
    locked: false,
    invitable: true,
    rateLimitPerUser: 0,
    messageCount: 3,
    memberCount: 2,
    createdAt: now,
    isThread: () => true,
    isTextBased: () => true,
    permissionsFor: () => botPermissions,
    members: {
      async add() {
        return true;
      },
      async remove() {
        return true;
      }
    },
    async setArchived(flag) {
      this.archived = flag;
      return this;
    },
    async setLocked(flag) {
      this.locked = flag;
      return this;
    },
    async join() {
      return this;
    },
    async leave() {
      return this;
    },
    async delete() {
      return this;
    }
  };

  const textChannel = {
    id: TEST_IDS.TEXT_CHANNEL_ID,
    guildId: TEST_IDS.GUILD_ID,
    guild,
    name: 'general',
    type: ChannelType.GuildText,
    parentId: TEST_IDS.CATEGORY_ID,
    position: 1,
    rawPosition: 1,
    topic: 'General discussion for EnzoCord',
    nsfw: false,
    rateLimitPerUser: 0,
    createdAt: now,
    isTextBased: () => true,
    isThread: () => false,
    permissionsFor: () => botPermissions,
    permissionOverwrites: {
      cache: overwritesMap,
      async set() {
        return overwritesMap;
      },
      async edit() {
        return overwritesMap;
      },
      async delete(targetId) {
        overwritesMap.delete(targetId);
        return overwritesMap;
      }
    },
    messages: {
      cache: createCollection([
        [mockMessage.id, mockMessage],
        [mockMessage2.id, mockMessage2]
      ]),
      async fetch(arg) {
        if (typeof arg === 'string') {
          return this.cache.get(arg) || null;
        }
        return this.cache;
      }
    },
    threads: {
      async create({ name, autoArchiveDuration, type }) {
        return {
          ...threadChannel,
          name,
          autoArchiveDuration,
          type
        };
      },
      async fetchArchived() {
        return {
          threads: createCollection([[threadChannel.id, { ...threadChannel, archived: true }]]),
          hasMore: false
        };
      }
    },
    invites: {
      async fetch() {
        return createCollection([[mockInvite.code, mockInvite]]);
      }
    },
    async createInvite(opts) {
      return {
        ...mockInvite,
        ...opts
      };
    },
    async createWebhook({ name }) {
      return {
        ...mockWebhook,
        name
      };
    },
    async fetchWebhooks() {
      return createCollection([[mockWebhook.id, mockWebhook]]);
    },
    async send(payload) {
      return {
        ...mockMessage,
        id: '888888888888888899',
        content: payload.content || '',
        embeds: payload.embeds || []
      };
    },
    async bulkDelete(target) {
      if (Array.isArray(target)) {
        return createCollection(target.map((id) => [id, mockMessage]));
      }
      return createCollection([
        [mockMessage.id, mockMessage],
        [mockMessage2.id, mockMessage2]
      ]);
    },
    async clone({ name } = {}) {
      return {
        ...this,
        id: '666666666666666699',
        name: name || `${this.name}-clone`
      };
    },
    async edit(data) {
      if (data.name !== undefined) {
        this.name = data.name;
      }
      if (data.topic !== undefined) {
        this.topic = data.topic;
      }
      if (data.nsfw !== undefined) {
        this.nsfw = data.nsfw;
      }
      if (data.rateLimitPerUser !== undefined) {
        this.rateLimitPerUser = data.rateLimitPerUser;
      }
      if (data.parent !== undefined) {
        this.parentId = data.parent;
      }
      if (data.position !== undefined) {
        this.position = data.position;
      }
      return this;
    },
    async setPosition(pos) {
      this.position = pos;
      return this;
    },
    async setTopic(topic) {
      this.topic = topic;
      return this;
    },
    async setName(name) {
      this.name = name;
      return this;
    },
    async setRateLimitPerUser(sec) {
      this.rateLimitPerUser = sec;
      return this;
    },
    async setNSFW(flag) {
      this.nsfw = flag;
      return this;
    },
    async delete() {
      return this;
    }
  };

  const voiceChannel = {
    id: TEST_IDS.VOICE_CHANNEL_ID,
    guildId: TEST_IDS.GUILD_ID,
    guild,
    name: 'General Voice',
    type: ChannelType.GuildVoice,
    parentId: TEST_IDS.CATEGORY_ID,
    position: 2,
    rawPosition: 2,
    bitrate: 64000,
    userLimit: 10,
    rtcRegion: null,
    createdAt: now,
    isTextBased: () => false,
    isThread: () => false,
    permissionsFor: () => botPermissions,
    permissionOverwrites: { cache: createCollection([]) },
    members: createCollection([[regularMember.id, regularMember]]),
    async edit(data) {
      Object.assign(this, data);
      return this;
    },
    async setUserLimit(limit) {
      this.userLimit = limit;
      return this;
    },
    async setBitrate(rate) {
      this.bitrate = rate;
      return this;
    }
  };

  const voiceChannel2 = {
    ...voiceChannel,
    id: TEST_IDS.VOICE_CHANNEL_2_ID,
    name: 'Gaming Voice',
    members: createCollection([])
  };

  const mockEmoji = {
    id: TEST_IDS.EMOJI_ID,
    guild,
    name: 'enzocord_logo',
    animated: false,
    available: true,
    managed: false,
    requiresColons: true,
    identifier: 'enzocord_logo:999999999999999991',
    roles: { cache: createCollection([]) },
    createdAt: now,
    imageURL: () => 'https://cdn.discordapp.com/emojis/999999999999999991.png',
    async edit(data) {
      if (data.name) {
        this.name = data.name;
      }
      return this;
    },
    async delete() {
      return this;
    }
  };

  const mockSticker = {
    id: TEST_IDS.STICKER_ID,
    guildId: TEST_IDS.GUILD_ID,
    guild,
    name: 'EnzoWave',
    description: 'Wave sticker',
    tags: 'wave',
    format: 1,
    available: true,
    url: 'https://cdn.discordapp.com/stickers/999999999999999992.png',
    createdAt: now,
    async delete() {
      return this;
    }
  };

  const mockEvent = {
    id: TEST_IDS.EVENT_ID,
    guildId: TEST_IDS.GUILD_ID,
    guild,
    channelId: TEST_IDS.VOICE_CHANNEL_ID,
    creatorId: TEST_IDS.OWNER_USER_ID,
    name: 'Community Townhall',
    description: 'Monthly community event',
    scheduledStartAt: new Date('2026-12-01T18:00:00.000Z'),
    scheduledEndAt: new Date('2026-12-01T19:00:00.000Z'),
    privacyLevel: 2,
    status: 1,
    entityType: 2,
    userCount: 12,
    url: 'https://discord.com/events/555555555555555555/999999999999999994',
    createdAt: now,
    async edit(data) {
      if (data.name) {
        this.name = data.name;
      }
      if (data.description) {
        this.description = data.description;
      }
      return this;
    },
    async delete() {
      return this;
    },
    async fetchSubscribers() {
      return createCollection([[regularUser.id, { user: regularUser }]]);
    }
  };

  const mockAutoModRule = {
    id: TEST_IDS.AUTOMOD_RULE_ID,
    guild,
    name: 'Block Bad Keywords',
    creatorId: TEST_IDS.OWNER_USER_ID,
    eventType: 1,
    triggerType: 1,
    triggerMetadata: {
      keywordFilter: ['scamlink'],
      regexPatterns: [],
      presets: [],
      allowList: []
    },
    actions: [{ type: 1, metadata: {} }],
    enabled: true,
    exemptRoles: createCollection([]),
    exemptChannels: createCollection([]),
    async edit(data) {
      if (data.name) {
        this.name = data.name;
      }
      if (data.enabled !== undefined) {
        this.enabled = data.enabled;
      }
      return this;
    },
    async delete() {
      return this;
    }
  };

  const mockAuditEntry = {
    id: TEST_IDS.AUDIT_ENTRY_ID,
    action: AuditLogEvent.MemberKick,
    actionType: 'DELETE',
    targetType: 'USER',
    executorId: TEST_IDS.OWNER_USER_ID,
    executor: ownerUser,
    targetId: TEST_IDS.MEMBER_USER_ID,
    reason: 'Spamming in general chat',
    changes: [],
    extra: null,
    createdAt: now
  };

  const mockCommand = {
    id: TEST_IDS.COMMAND_ID,
    applicationId: TEST_IDS.BOT_USER_ID,
    guildId: TEST_IDS.GUILD_ID,
    name: 'status',
    description: 'Check server status',
    type: 1,
    nsfw: false,
    version: '1',
    options: [],
    createdAt: now
  };

  const channelsCache = createCollection([
    [categoryChannel.id, categoryChannel],
    [textChannel.id, textChannel],
    [voiceChannel.id, voiceChannel],
    [voiceChannel2.id, voiceChannel2],
    [threadChannel.id, threadChannel]
  ]);

  const rolesCache = createCollection([
    [everyoneRole.id, everyoneRole],
    [memberRole.id, memberRole],
    [managedRole.id, managedRole],
    [botRole.id, botRole],
    [highAdminRole.id, highAdminRole]
  ]);

  const membersCache = createCollection([
    [botMember.id, botMember],
    [ownerMember.id, ownerMember],
    [adminMember.id, adminMember],
    [regularMember.id, regularMember]
  ]);

  guild.channels = {
    cache: channelsCache,
    async fetch(id) {
      return channelsCache.get(id) || null;
    },
    async create(data) {
      const created = {
        ...textChannel,
        id: '666666666666666688',
        name: data.name,
        type: data.type ?? ChannelType.GuildText,
        parentId: data.parent ?? null,
        topic: data.topic ?? null
      };
      return created;
    },
    async fetchActiveThreads() {
      return {
        threads: createCollection([[threadChannel.id, threadChannel]])
      };
    }
  };

  guild.roles = {
    cache: rolesCache,
    async fetch(id) {
      return rolesCache.get(id) || null;
    },
    async create(data) {
      return {
        ...memberRole,
        id: '777777777777777799',
        name: data.name,
        color: data.color ?? 0,
        hoist: Boolean(data.hoist),
        mentionable: Boolean(data.mentionable),
        position: 1
      };
    }
  };

  guild.members = {
    me: botMember,
    cache: membersCache,
    async fetch(id) {
      return membersCache.get(id) || null;
    },
    async list() {
      return membersCache;
    },
    async search({ query }) {
      const q = query.toLowerCase();
      return membersCache.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.user.username.toLowerCase().includes(q)
      );
    },
    async ban(userId) {
      return { id: userId };
    },
    async unban(userId) {
      return { id: userId, username: 'unbanned_user', tag: 'unbanned_user' };
    }
  };

  guild.emojis = {
    cache: createCollection([[mockEmoji.id, mockEmoji]]),
    async fetch(id) {
      return id === mockEmoji.id ? mockEmoji : null;
    },
    async create({ name }) {
      return {
        ...mockEmoji,
        id: '999999999999999981',
        name
      };
    }
  };

  guild.stickers = {
    cache: createCollection([[mockSticker.id, mockSticker]]),
    async fetch(id) {
      return id === mockSticker.id ? mockSticker : null;
    },
    async create({ name, tags, description }) {
      return {
        ...mockSticker,
        id: '999999999999999982',
        name,
        tags,
        description
      };
    }
  };

  guild.invites = {
    async fetch() {
      return createCollection([[mockInvite.code, mockInvite]]);
    }
  };

  guild.bans = {
    async fetch() {
      return createCollection([
        [
          '900000000000000001',
          {
            user: {
              id: '900000000000000001',
              username: 'banned_account',
              tag: 'banned_account',
              bot: false
            },
            reason: 'Rule violation'
          }
        ]
      ]);
    }
  };

  guild.scheduledEvents = {
    cache: createCollection([[mockEvent.id, mockEvent]]),
    async fetch(id) {
      if (id) {
        return id === mockEvent.id ? mockEvent : null;
      }
      return this.cache;
    },
    async create(data) {
      return {
        ...mockEvent,
        id: '999999999999999984',
        name: data.name,
        description: data.description ?? null
      };
    }
  };

  guild.autoModerationRules = {
    cache: createCollection([[mockAutoModRule.id, mockAutoModRule]]),
    async fetch(id) {
      if (id) {
        return id === mockAutoModRule.id ? mockAutoModRule : null;
      }
      return this.cache;
    },
    async create(data) {
      return {
        ...mockAutoModRule,
        id: '999999999999999985',
        name: data.name,
        enabled: data.enabled ?? true
      };
    }
  };

  guild.commands = {
    cache: createCollection([[mockCommand.id, mockCommand]]),
    async fetch(id) {
      if (id) {
        return id === mockCommand.id ? mockCommand : null;
      }
      return this.cache;
    },
    async create(data) {
      return {
        ...mockCommand,
        id: '999999999999999987',
        name: data.name,
        description: data.description
      };
    },
    async edit(id, data) {
      return {
        ...mockCommand,
        id,
        ...data
      };
    },
    async delete() {
      return true;
    }
  };

  guild.voiceStates = {
    cache: createCollection([[regularMember.id, regularMember.voice]])
  };

  guild.fetchOwner = async () => ownerMember;
  guild.fetchPreview = async () => ({
    id: guild.id,
    name: guild.name,
    description: guild.description,
    approximateMemberCount: 4,
    approximatePresenceCount: 2,
    features: guild.features,
    emojis: guild.emojis.cache,
    stickers: guild.stickers.cache
  });
  guild.fetchIntegrations = async () => createCollection([]);
  guild.fetchWebhooks = async () => createCollection([[mockWebhook.id, mockWebhook]]);
  guild.fetchAuditLogs = async () => ({
    entries: createCollection([[mockAuditEntry.id, mockAuditEntry]])
  });

  const client = {
    isReady: () => true,
    user: botUser,
    readyAt: now,
    uptime: 120000,
    ws: {
      ping: 42,
      status: 0,
      shards: createCollection([[0, { id: 0, status: 0, ping: 42 }]])
    },
    application: {
      id: TEST_IDS.BOT_USER_ID,
      name: 'Discord AI MCP Application',
      description: 'Local MCP Discord management application',
      botPublic: false,
      botRequireCodeGrant: false,
      createdAt: now,
      commands: guild.commands,
      async fetch() {
        return this;
      }
    },
    guilds: {
      cache: createCollection([[guild.id, guild]]),
      async fetch(id) {
        return id === guild.id ? guild : null;
      }
    },
    channels: {
      cache: channelsCache,
      async fetch(id) {
        return channelsCache.get(id) || null;
      }
    },
    users: {
      cache: createCollection([
        [botUser.id, botUser],
        [ownerUser.id, ownerUser],
        [adminUser.id, adminUser],
        [regularUser.id, regularUser]
      ])
    },
    rest: {
      async put() {
        return {};
      }
    },
    async fetchInvite(code) {
      if (code === mockInvite.code) {
        return mockInvite;
      }
      throw new Error('Unknown Invite');
    },
    generateInvite() {
      return `https://discord.com/oauth2/authorize?client_id=${TEST_IDS.BOT_USER_ID}&scope=bot+applications.commands&permissions=8`;
    },
    on() { },
    async login() {
      return 'logged_in';
    },
    async destroy() {
      return true;
    }
  };

  return {
    client,
    guild,
    categoryChannel,
    textChannel,
    voiceChannel,
    voiceChannel2,
    threadChannel,
    everyoneRole,
    memberRole,
    botRole,
    highAdminRole,
    managedRole,
    botMember,
    ownerMember,
    adminMember,
    regularMember,
    mockMessage,
    mockWebhook,
    mockInvite,
    mockEmoji,
    mockSticker,
    mockEvent,
    mockAutoModRule,
    mockAuditEntry,
    mockCommand
  };
}

