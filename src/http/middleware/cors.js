/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export class CorsManager {
  constructor({ config, originValidator } = {}) {
    this.enabled = Boolean(config?.network?.corsEnabled ?? true);
    this.originValidator = originValidator;
  }

  applyCorsHeaders(request, reply) {
    if (!this.enabled) {
      return { handledPreflight: false, rejected: false };
    }

    const originHeader = request.headers.origin;
    if (!originHeader) {
      return { handledPreflight: false, rejected: false };
    }

    const validation = this.originValidator.validate(originHeader);
    if (!validation.ok) {
      return {
        handledPreflight: false,
        rejected: true,
        errorMessage: validation.message
      };
    }

    reply.header('Access-Control-Allow-Origin', originHeader);
    reply.header('Vary', 'Origin');
    reply.header('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
    reply.header(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID, X-Request-Id'
    );
    reply.header(
      'Access-Control-Expose-Headers',
      'Mcp-Session-Id, MCP-Protocol-Version, X-Request-Id, WWW-Authenticate'
    );
    reply.header('Access-Control-Max-Age', '600');

    if (request.method === 'OPTIONS') {
      reply.code(204).send();
      return { handledPreflight: true, rejected: false };
    }

    return { handledPreflight: false, rejected: false };
  }
}

