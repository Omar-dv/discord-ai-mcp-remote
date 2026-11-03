/*
 * Copyright (c) 2026 Omar ElSabbagh.
 * Licensed under the MIT License.
 */

export function registerOAuthDiscoveryRoutes(fastify, { oauthProvider }) {
  const sendProtectedResourceMetadata = async (_request, reply) => {
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

  fastify.get('/.well-known/oauth-protected-resource', sendProtectedResourceMetadata);
  fastify.get('/.well-known/oauth-protected-resource/*', sendProtectedResourceMetadata);

  fastify.get('/.well-known/oauth-authorization-server', async (_request, reply) => {
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
  });
}

