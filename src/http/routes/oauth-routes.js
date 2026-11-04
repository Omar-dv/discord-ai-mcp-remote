/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

import crypto from 'node:crypto';
import { ALL_AUTH_SCOPES } from '../../core/constants.js';
import { verifyPkceS256 } from '../../auth/oauth/oauth-provider.js';

const pendingAuthCodes = new Map();
const registeredClients = new Map();

function parseRequestBody(request) {
  if (!request.body) {
    return {};
  }
  if (Buffer.isBuffer(request.body)) {
    const raw = request.body.toString('utf8').trim();
    if (!raw) {
      return {};
    }
    if (raw.startsWith('{')) {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
  if (typeof request.body === 'string') {
    const raw = request.body.trim();
    if (raw.startsWith('{')) {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
  if (typeof request.body === 'object') {
    return request.body;
  }
  return {};
}

function extractClientCredentials(request, body) {
  let clientId = body.client_id || '';
  let clientSecret = body.client_secret || '';

  const authHeader = request.headers?.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8');
      const sepIndex = decoded.indexOf(':');
      if (sepIndex !== -1) {
        const basicId = decodeURIComponent(decoded.slice(0, sepIndex));
        const basicSecret = decodeURIComponent(decoded.slice(sepIndex + 1));
        if (!clientId) {
          clientId = basicId;
        }
        if (!clientSecret) {
          clientSecret = basicSecret;
        }
      }
    } catch {
      void 0;
    }
  }

  return { clientId: String(clientId || '').trim(), clientSecret: String(clientSecret || '').trim() };
}

function applyOAuthCors(reply) {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Protocol-Version');
}

function verifyApiKeySafe(authenticationManager, rawKey) {
  if (!rawKey || !authenticationManager?.apiKeyManager) {
    return null;
  }
  try {
    return authenticationManager.apiKeyManager.verifyKey(String(rawKey).trim());
  } catch {
    return null;
  }
}

function renderAuthorizeHtml({ query, errorMessage = '' }) {
  const escapedError = errorMessage
    ? `<div style="background:#ef444422;border:1px solid #ef4444;color:#fca5a5;padding:10px 12px;border-radius:8px;margin-bottom:16px;font-size:14px;">${errorMessage}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize — Discord AI MCP Remote</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="width:100%;max-width:420px;background:#1e293b;border:1px solid #334155;border-radius:14px;padding:28px;box-shadow:0 20px 40px rgba(0,0,0,0.4);">
    <h2 style="margin:0 0 6px 0;font-size:20px;color:#fff;">Discord AI MCP Remote</h2>
    <p style="margin:0 0 20px 0;font-size:13px;color:#94a3b8;">Created by Omar ElSabbagh (EnzoCord)</p>
    ${escapedError}
    <form method="POST" action="/authorize">
      <input type="hidden" name="client_id" value="${String(query.client_id || '').replace(/"/g, '&quot;')}" />
      <input type="hidden" name="redirect_uri" value="${String(query.redirect_uri || '').replace(/"/g, '&quot;')}" />
      <input type="hidden" name="state" value="${String(query.state || '').replace(/"/g, '&quot;')}" />
      <input type="hidden" name="code_challenge" value="${String(query.code_challenge || '').replace(/"/g, '&quot;')}" />
      <input type="hidden" name="code_challenge_method" value="${String(query.code_challenge_method || 'S256').replace(/"/g, '&quot;')}" />
      <input type="hidden" name="scope" value="${String(query.scope || '').replace(/"/g, '&quot;')}" />
      <label style="display:block;font-size:13px;margin-bottom:6px;color:#cbd5e1;">Enter your API Key (or leave blank if entered as Client Secret in Claude):</label>
      <input type="password" name="api_key" placeholder="damcp_live_..." style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#fff;font-size:14px;margin-bottom:18px;" />
      <button type="submit" style="width:100%;padding:11px;border:none;border-radius:8px;background:#6366f1;color:#fff;font-weight:600;font-size:15px;cursor:pointer;">Authorize Connection</button>
    </form>
  </div>
</body>
</html>`;
}

export function registerOAuthDiscoveryRoutes(fastify, { oauthProvider, authenticationManager }) {
  const sendProtectedResourceMetadata = async (_request, reply) => {
    applyOAuthCors(reply);
    if (!oauthProvider?.isEnabled()) {
      reply.code(404).send({
        error: 'not_found',
        error_description: 'OAuth 2.1 Protected Resource Metadata is not enabled on this server.'
      });
      return;
    }
    const metadata = oauthProvider.getProtectedResourceMetadata();
    reply.header('Cache-Control', 'public, max-age=3600');
    reply.code(200).send(metadata);
  };

  const sendAuthServerMetadata = async (_request, reply) => {
    applyOAuthCors(reply);
    if (!oauthProvider?.isEnabled()) {
      reply.code(404).send({
        error: 'not_found',
        error_description: 'OAuth 2.1 Authorization Server Metadata is not enabled on this server.'
      });
      return;
    }
    const metadata = oauthProvider.getAuthorizationServerMetadata();
    reply.header('Cache-Control', 'public, max-age=3600');
    reply.code(200).send(metadata);
  };

  fastify.options('/.well-known/*', async (_request, reply) => {
    applyOAuthCors(reply);
    reply.code(204).send();
  });

  fastify.get('/.well-known/oauth-protected-resource', sendProtectedResourceMetadata);
  fastify.get('/.well-known/oauth-protected-resource/*', sendProtectedResourceMetadata);
  fastify.get('/.well-known/oauth-authorization-server', sendAuthServerMetadata);
  fastify.get('/.well-known/oauth-authorization-server/*', sendAuthServerMetadata);
  fastify.get('/.well-known/openid-configuration', sendAuthServerMetadata);

  fastify.options('/register', async (_request, reply) => {
    applyOAuthCors(reply);
    reply.code(204).send();
  });

  fastify.post('/register', async (request, reply) => {
    applyOAuthCors(reply);
    const body = parseRequestBody(request);
    const clientId = `dcr_${crypto.randomBytes(8).toString('hex')}`;
    const record = {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: body.client_name || 'MCP OAuth Client',
      redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
      grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
      response_types: body.response_types || ['code'],
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'none'
    };
    registeredClients.set(clientId, record);
    reply.code(201).send(record);
  });

  fastify.get('/authorize', async (request, reply) => {
    const query = request.query || {};
    if (query.client_id === 'enzo-claude' && query.redirect_uri) {
      const code = `authcode_${crypto.randomBytes(24).toString('base64url')}`;
      pendingAuthCodes.set(code, {
        clientId: String(query.client_id),
        redirectUri: String(query.redirect_uri),
        codeChallenge: String(query.code_challenge || ''),
        codeChallengeMethod: String(query.code_challenge_method || 'S256'),
        verifiedKey: null,
        createdAt: Date.now()
      });
      const redirectUrl = new URL(String(query.redirect_uri));
      redirectUrl.searchParams.set('code', code);
      if (query.state) {
        redirectUrl.searchParams.set('state', String(query.state));
      }
      reply.redirect(redirectUrl.toString());
      return;
    }

    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'unsafe-inline'; form-action *"
    );
    reply.type('text/html; charset=utf-8').code(200).send(renderAuthorizeHtml({ query }));
  });

  fastify.post('/authorize', async (request, reply) => {
    const body = parseRequestBody(request);
    const redirectUri = String(body.redirect_uri || '').trim();
    if (!redirectUri) {
      reply.code(400).send({ error: 'invalid_request', error_description: 'Missing redirect_uri' });
      return;
    }

    let verifiedKey = null;
    const rawKey = String(body.api_key || '').trim();
    if (rawKey) {
      verifiedKey = verifyApiKeySafe(authenticationManager, rawKey);
      if (!verifiedKey) {
        reply.header(
          'Content-Security-Policy',
          "default-src 'self'; style-src 'unsafe-inline'; form-action *"
        );
        reply
          .type('text/html; charset=utf-8')
          .code(401)
          .send(renderAuthorizeHtml({ query: body, errorMessage: 'Invalid API Key. Please check your key and try again.' }));
        return;
      }
    }

    const code = `authcode_${crypto.randomBytes(24).toString('base64url')}`;
    pendingAuthCodes.set(code, {
      clientId: String(body.client_id || 'mcp-client'),
      redirectUri,
      codeChallenge: String(body.code_challenge || ''),
      codeChallengeMethod: String(body.code_challenge_method || 'S256'),
      verifiedKey,
      createdAt: Date.now()
    });

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (body.state) {
      redirectUrl.searchParams.set('state', String(body.state));
    }
    reply.redirect(redirectUrl.toString());
  });

  fastify.options('/token', async (_request, reply) => {
    applyOAuthCors(reply);
    reply.code(204).send();
  });

  fastify.post('/token', async (request, reply) => {
    applyOAuthCors(reply);
    const body = parseRequestBody(request);
    const { clientId, clientSecret } = extractClientCredentials(request, body);
    const grantType = String(body.grant_type || 'authorization_code');

    if (grantType === 'authorization_code') {
      const code = String(body.code || '').trim();
      const record = pendingAuthCodes.get(code);
      if (!record || Date.now() - record.createdAt > 600000) {
        pendingAuthCodes.delete(code);
        reply.code(400).send({ error: 'invalid_grant', error_description: 'Authorization code is invalid or expired.' });
        return;
      }
      pendingAuthCodes.delete(code);

      if (record.codeChallenge) {
        const verifier = String(body.code_verifier || '');
        if (!verifyPkceS256(verifier, record.codeChallenge)) {
          reply.code(400).send({ error: 'invalid_grant', error_description: 'PKCE code_verifier validation failed.' });
          return;
        }
      }

      let keyAuth = record.verifiedKey;
      if (!keyAuth && clientSecret) {
        keyAuth = verifyApiKeySafe(authenticationManager, clientSecret);
      }

      if (!keyAuth) {
        reply.code(401).send({
          error: 'invalid_client',
          error_description: 'Valid API Key required as OAuth client_secret or during /authorize approval.'
        });
        return;
      }

      const accessToken = `damcp_oauth_${crypto.randomBytes(32).toString('base64url')}`;
      const refreshToken = `damcp_refresh_${crypto.randomBytes(32).toString('base64url')}`;
      const tokenHash = crypto.createHash('sha256').update(accessToken, 'utf8').digest('hex');
      const refreshHash = crypto.createHash('sha256').update(refreshToken, 'utf8').digest('hex');
      const expiresIn = 31536000;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const scopes = keyAuth.scopes?.length ? keyAuth.scopes : ALL_AUTH_SCOPES;

      oauthProvider.oauthRepo.storeToken({
        tokenId: `tok_${crypto.randomBytes(8).toString('hex')}`,
        tokenHash,
        refreshTokenHash: refreshHash,
        clientId: clientId || record.clientId || 'enzo-claude',
        identityId: keyAuth.identityId || 'owner',
        scopes,
        allowedGuildIds: keyAuth.allowedGuildIds || [],
        audience: oauthProvider.getResourceServerUrl().href,
        expiresAt
      });

      reply.header('Cache-Control', 'no-store');
      reply.code(200).send({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshToken,
        scope: scopes.join(' ')
      });
      return;
    }

    if (grantType === 'client_credentials') {
      const keyAuth = clientSecret
        ? verifyApiKeySafe(authenticationManager, clientSecret)
        : null;
      if (!keyAuth) {
        reply.code(401).send({ error: 'invalid_client', error_description: 'Invalid client_secret.' });
        return;
      }
      const accessToken = `damcp_oauth_${crypto.randomBytes(32).toString('base64url')}`;
      const tokenHash = crypto.createHash('sha256').update(accessToken, 'utf8').digest('hex');
      const expiresIn = 31536000;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const scopes = keyAuth.scopes?.length ? keyAuth.scopes : ALL_AUTH_SCOPES;

      oauthProvider.oauthRepo.storeToken({
        tokenId: `tok_${crypto.randomBytes(8).toString('hex')}`,
        tokenHash,
        refreshTokenHash: null,
        clientId: clientId || 'enzo-claude',
        identityId: keyAuth.identityId || 'owner',
        scopes,
        allowedGuildIds: keyAuth.allowedGuildIds || [],
        audience: oauthProvider.getResourceServerUrl().href,
        expiresAt
      });

      reply.header('Cache-Control', 'no-store');
      reply.code(200).send({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        scope: scopes.join(' ')
      });
      return;
    }

    reply.code(400).send({ error: 'unsupported_grant_type', error_description: `Unsupported grant_type: ${grantType}` });
  });
}
