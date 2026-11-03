/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import {
  isInitializeRequest,
  SUPPORTED_PROTOCOL_VERSIONS,
  WebStandardStreamableHTTPServerTransport
} from '@modelcontextprotocol/server';
import { ERROR_CODES } from '../core/constants.js';

function createJsonRpcResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

function isInitializePayload(parsedBody) {
  if (!parsedBody) {
    return false;
  }
  const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
  return messages.some((msg) => isInitializeRequest(msg));
}

export class StreamableHttpTransportManager {
  constructor({
    discordMcpServer,
    sessionManager,
    authorizationManager,
    config,
    logger
  } = {}) {
    this.discordMcpServer = discordMcpServer;
    this.sessionManager = sessionManager;
    this.authorizationManager = authorizationManager;
    this.config = config;
    this.logger = logger;
    this.sessionMode = config?.session?.mode || 'stateless';
    this.maxRequestSize = config?.network?.maxRequestSize || 1048576;
  }

  normalizeWebRequest(url, method, headers, rawBodyBuffer) {
    const normalizedHeaders = new Headers();
    for (const [key, val] of Object.entries(headers || {})) {
      if (val === undefined || val === null) {
        continue;
      }
      if (Array.isArray(val)) {
        normalizedHeaders.set(key, val.join(', '));
      } else {
        normalizedHeaders.set(key, String(val));
      }
    }

    if (method === 'POST') {
      const currentAccept = normalizedHeaders.get('accept') || '';
      if (
        !currentAccept.includes('application/json') ||
        !currentAccept.includes('text/event-stream')
      ) {
        normalizedHeaders.set('accept', 'application/json, text/event-stream');
      }
    }

    const requestInit = {
      method,
      headers: normalizedHeaders
    };

    if (method !== 'GET' && method !== 'HEAD' && rawBodyBuffer && rawBodyBuffer.length > 0) {
      requestInit.body = rawBodyBuffer;
    }

    return new Request(url, requestInit);
  }

  validateProtocolVersionHeader(headers) {
    const versionHeader = headers?.['mcp-protocol-version'];
    if (!versionHeader) {
      return null;
    }
    const cleanVersion = String(versionHeader).trim();
    if (!SUPPORTED_PROTOCOL_VERSIONS.includes(cleanVersion)) {
      return createJsonRpcResponse(400, {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `Unsupported MCP-Protocol-Version "${cleanVersion}". Supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(', ')}`
        },
        id: null
      });
    }
    return null;
  }

  async handleHttpExchange({ url, method, headers, rawBodyBuffer, parsedBody, authContext }) {
    const upperMethod = String(method || 'GET').toUpperCase();

    if (!['POST', 'GET', 'DELETE'].includes(upperMethod)) {
      return createJsonRpcResponse(
        405,
        {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed. Supported MCP methods: POST, GET, DELETE.'
          },
          id: null
        },
        { Allow: 'POST, GET, DELETE' }
      );
    }

    const protocolErrorResponse = this.validateProtocolVersionHeader(headers);
    if (protocolErrorResponse && !isInitializePayload(parsedBody)) {
      return protocolErrorResponse;
    }

    if (upperMethod === 'POST') {
      const contentType = String(headers?.['content-type'] || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        return createJsonRpcResponse(415, {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Unsupported Media Type: Content-Type must be application/json'
          },
          id: null
        });
      }
    }

    return this.authorizationManager.runWithAuthContext(authContext, async () => {
      if (this.sessionMode === 'stateful') {
        return this.handleStatefulRequest({
          url,
          method: upperMethod,
          headers,
          rawBodyBuffer,
          parsedBody,
          authContext
        });
      }

      return this.handleStatelessRequest({
        url,
        method: upperMethod,
        headers,
        rawBodyBuffer,
        parsedBody,
        authContext
      });
    });
  }

  async handleStatelessRequest({ url, method, headers, rawBodyBuffer, parsedBody, authContext }) {
    if (method !== 'POST') {
      return createJsonRpcResponse(
        405,
        {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed in stateless MCP mode. Use POST for JSON-RPC requests.'
          },
          id: null
        },
        { Allow: 'POST' }
      );
    }

    const clientAccept = String(headers?.accept || '');
    const clientExplicitlyWantsSseOnly =
      clientAccept.includes('text/event-stream') && !clientAccept.includes('application/json');

    const mcpServerInstance = this.discordMcpServer.createInstance();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: !clientExplicitlyWantsSseOnly,
      maxRequestBodySize: this.maxRequestSize
    });

    await mcpServerInstance.connect(transport);

    let response = null;
    try {
      const webRequest = this.normalizeWebRequest(url, method, headers, rawBodyBuffer);
      response = await transport.handleRequest(webRequest, {
        authInfo: authContext?.authInfo,
        ...(parsedBody !== undefined ? { parsedBody } : {})
      });
      return response;
    } finally {
      const respContentType = response?.headers?.get('content-type') || '';
      if (!respContentType.includes('text/event-stream')) {
        await transport.close().catch(() => {});
        await mcpServerInstance.close().catch(() => {});
      }
    }
  }

  async handleStatefulRequest({ url, method, headers, rawBodyBuffer, parsedBody, authContext }) {
    const sessionIdHeader = headers?.['mcp-session-id'];
    const isInit = method === 'POST' && isInitializePayload(parsedBody);

    if (isInit) {
      if (sessionIdHeader) {
        return createJsonRpcResponse(400, {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: Cannot send Mcp-Session-Id header on initialize request.'
          },
          id: parsedBody?.id ?? null
        });
      }

      const generatedSessionId = this.sessionManager.generateSessionId();
      const mcpServerInstance = this.discordMcpServer.createInstance();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => generatedSessionId,
        enableJsonResponse: true,
        maxRequestBodySize: this.maxRequestSize,
        onsessionclosed: async (closedId) => {
          await this.sessionManager.terminateSession(closedId);
        }
      });

      await mcpServerInstance.connect(transport);
      await this.sessionManager.createSession({
        sessionId: generatedSessionId,
        identity: authContext.identity,
        mcpServerInstance,
        transport
      });

      const webRequest = this.normalizeWebRequest(url, method, headers, rawBodyBuffer);
      return transport.handleRequest(webRequest, {
        authInfo: authContext?.authInfo,
        ...(parsedBody !== undefined ? { parsedBody } : {})
      });
    }

    let session;
    try {
      session = this.sessionManager.getAndValidateSession(sessionIdHeader, authContext.identity);
    } catch (error) {
      const statusMap = {
        [ERROR_CODES.VALIDATION_ERROR]: 400,
        [ERROR_CODES.SESSION_NOT_FOUND]: 404,
        [ERROR_CODES.SESSION_EXPIRED]: 404,
        [ERROR_CODES.FORBIDDEN]: 403
      };
      const httpStatus = statusMap[error.code] || 400;
      return createJsonRpcResponse(httpStatus, {
        jsonrpc: '2.0',
        error: {
          code: httpStatus === 404 ? -32001 : -32000,
          message: error.message
        },
        id: parsedBody?.id ?? null
      });
    }

    if (method === 'DELETE') {
      await this.sessionManager.terminateSession(session.sessionId);
      return new Response(null, { status: 200 });
    }

    const webRequest = this.normalizeWebRequest(url, method, headers, rawBodyBuffer);
    return session.transport.handleRequest(webRequest, {
      authInfo: authContext?.authInfo,
      ...(parsedBody !== undefined ? { parsedBody } : {})
    });
  }
}
