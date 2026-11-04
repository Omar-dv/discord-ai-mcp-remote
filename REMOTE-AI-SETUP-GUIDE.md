# دليل رفع وتشغيل Discord AI MCP Remote على سيرفر (VPS) وربطه بجميع منصات الذكاء الاصطناعي

> **Official Attribution:**
> *"This project was created by Omar ElSabbagh, a professional programmer from Egypt and the owner of the EnzoCord Discord community."*

---

## أولاً: رفع وتشغيل المشروع على السيرفر (VPS)

### 1. تنزيل المشروع وتثبيت المكتبات
```bash
git clone https://github.com/Omar-dv/discord-ai-mcp-remote.git
cd discord-ai-mcp-remote
npm install --omit=dev
cp .env.example .env
```

### 2. إعداد ملف `.env`
افتح ملف `.env` وعدل القيم الأساسية:
```env
NODE_ENV=production
DISCORD_TOKEN=ضع_توكن_البوت_هنا
DISCORD_APPLICATION_ID=ضع_الـ_Application_ID_هنا

HOST=0.0.0.0
PORT=3400
PUBLIC_BASE_URL=https://mcp.example.com
MCP_ENDPOINT_PATH=/mcp
TRUST_PROXY=true

ALLOWED_HOSTS=localhost,127.0.0.1,mcp.example.com
ALLOWED_ORIGINS=localhost,127.0.0.1,mcp.example.com,claude.ai,chatgpt.com,platform.openai.com

AUTH_MODE=hybrid
API_KEY_PEPPER=ضع_نص_عشوائي_طويل_64_حرف
SESSION_SIGNING_SECRET=ضع_نص_عشوائي_طويل_64_حرف

OAUTH_ENABLED=true
OAUTH_ISSUER_URL=https://mcp.example.com
OAUTH_RESOURCE_SERVER_URL=https://mcp.example.com/mcp
```

> **💡 نصيحة لو معندكش دومين:** تقدر تستخدم خدمة `sslip.io` المجانية مباشرة بكتابة الـ IP بتاع السيرفر بالشكل ده:
> `https://mcp.YOUR_VPS_IP.sslip.io`

### 3. توليد مفتاح الـ Master API Key (شامل كل الصلاحيات)
```bash
npm run generate-key -- --label "master-admin"
```
انسخ المفتاح اللي هيظهرلك (بيبدأ بـ `damcp_live_...`) واحتفظ بيه.

### 4. تشغيل السيرفر بشكل دائم عبر PM2 (أو Docker)

**عبر PM2:**
```bash
pm2 start src/index.js --name discord-ai-mcp-remote
pm2 save
```

**أو عبر Docker Compose:**
```bash
docker compose up -d --build
```

### 5. تفعيل الـ HTTPS (SSL)
- **لو عندك Caddy:** استخدم الملف الجاهز في `deploy/caddy/Caddyfile`.
- **لو عندك Nginx:** استخدم الملف الجاهز في `deploy/nginx/discord-ai-mcp.conf`.
- **لو عندك Coolify / Traefik:** أضف ملف `/data/coolify/proxy/dynamic/discord-ai-mcp.yaml` يوجه الدومين لبورت `3400`.

اختبر أن السيرفر يعمل بنجاح:
```bash
curl https://mcp.example.com/healthz
```

---

## ثانياً: ربط السيرفر بجميع منصات الذكاء الاصطناعي (AI Platforms)

> في الأمثلة بالأسفل:
> - استبدل `https://mcp.example.com/mcp` برابط السيرفر بتاعك.
> - استبدل `damcp_live_YOUR_API_KEY` بمفتاح الـ API اللي ولدته.

---

### 1. Claude (موقع Claude.ai وتطبيق Claude Desktop — عبر Custom Connectors)

1. افتح **Claude** ⬅️ **Settings** ⬅️ **Connectors** ⬅️ **Add custom connector**.
2. في خانة الرابط (**URL**) حط:
   ```text
   https://mcp.example.com/mcp
   ```
3. تحت **Authentication** سيبها على: `Sign in now`
4. تحت **OAuth client** اختار `Use your own OAuth client` وحط:
   - **OAuth client ID:** `enzo-claude`
   - **OAuth client secret:** `damcp_live_YOUR_API_KEY`
5. اضغط **Add / Sign in** وهيربط فوراً بشكل تلقائي!

---

### 2. Claude Desktop (عبر ملف `claude_desktop_config.json`)

لو حابب تربطه عن طريق ملف الإعدادات المحلي بدون Custom Connector:

```json
{
  "mcpServers": {
    "discord-ai-mcp-remote": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.example.com/mcp",
        "--header",
        "Authorization: Bearer damcp_live_YOUR_API_KEY"
      ]
    }
  }
}
```

---

### 3. Claude Code (في الـ Terminal)

أمر واحد في الـ Terminal:

```bash
claude mcp add --transport http discord-ai-mcp-remote https://mcp.example.com/mcp --header "Authorization: Bearer damcp_live_YOUR_API_KEY"
```

---

### 4. ChatGPT (موقع ChatGPT وتطبيق سطح المكتب — Connectors / Deep Research / API)

#### أ) من داخل واجهة ChatGPT (Settings -> Connectors -> Create Custom MCP Connector):
- **MCP Server URL:** `https://mcp.example.com/mcp`
- **Authentication:** `OAuth`
  - **Client ID:** `enzo-claude`
  - **Client Secret:** `damcp_live_YOUR_API_KEY`
  *(أو اختر **Bearer Token / API Key** وضع `damcp_live_YOUR_API_KEY`).*

#### ب) عبر OpenAI Responses API / Agents SDK:
```javascript
const response = await openai.responses.create({
  model: 'gpt-4.1',
  tools: [
    {
      type: 'mcp',
      server_label: 'discord_ai_mcp',
      server_url: 'https://mcp.example.com/mcp',
      headers: {
        Authorization: 'Bearer damcp_live_YOUR_API_KEY'
      }
    }
  ],
  input: 'اعرض لي قائمة الرومات في سيرفر الديسكورد'
});
```

---

### 5. Gemini (Gemini CLI / Google Antigravity / Gemini SDK)

في ملف `~/.gemini/settings.json` (أو إعدادات MCP في Antigravity):

```json
{
  "mcpServers": {
    "discord-ai-mcp-remote": {
      "httpUrl": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer damcp_live_YOUR_API_KEY"
      }
    }
  }
}
```

---

### 6. DeepSeek & Kimi (Moonshot AI)

تقدر تستخدم **DeepSeek (V3 / R1)** و **Kimi (k1.5 / k2)** مع السيرفر الريموت مباشرة عبر أي برنامج يدعم `Streamable HTTP MCP` مثل **Cherry Studio** أو **Chatbox** أو **LibreChat** أو **Cline / Roo Code**:

1. **في Cherry Studio / Chatbox:**
   - ادخل على **Settings** ⬅️ **MCP Servers** ⬅️ **Add Server**.
   - **Name:** `discord-ai-mcp-remote`
   - **Type:** `Streamable HTTP` (أو `HTTP`)
   - **URL:** `https://mcp.example.com/mcp`
   - **Headers:**
     ```text
     Authorization: Bearer damcp_live_YOUR_API_KEY
     ```
   - فعل السيرفر مع موديل **DeepSeek** أو **Kimi** في الشات.

2. **في Cline / Roo Code / Continue:**
   ```json
   {
     "mcpServers": {
       "discord-ai-mcp-remote": {
         "url": "https://mcp.example.com/mcp",
         "headers": {
           "Authorization": "Bearer damcp_live_YOUR_API_KEY"
         }
       }
     }
   }
   ```

---

### 7. Cursor IDE & Windsurf & VS Code

- **في Cursor (`.cursor/mcp.json`) أو Windsurf (`mcp_config.json`):**
  ```json
  {
    "mcpServers": {
      "discord-ai-mcp-remote": {
        "url": "https://mcp.example.com/mcp",
        "headers": {
          "Authorization": "Bearer damcp_live_YOUR_API_KEY"
        }
      }
    }
  }
  ```

- **في VS Code (`.vscode/mcp.json`):**
  ```json
  {
    "servers": {
      "discord-ai-mcp-remote": {
        "type": "http",
        "url": "https://mcp.example.com/mcp",
        "headers": {
          "Authorization": "Bearer damcp_live_YOUR_API_KEY"
        }
      }
    }
  }
  ```
