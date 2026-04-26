# UiPath TypeScript SDK — Getting Started Guide

A hands-on walkthrough built with Claude Code showing how to go from zero to a deployed UiPath Coded App using the `@uipath/uipath-typescript` SDK.

---

## Try It Yourself with Claude Code

The best way to learn this isn't to read the guide — it's to build it yourself with Claude Code as your coding partner. This repo includes a `CLAUDE.md` file that automatically gives Claude the context it needs to guide you.

**Time:** ~1.5–2.5 hours for all three parts. Each part can be done independently in 20–60 minutes.

**Setup:**
1. Install [Claude Code](https://claude.ai/code)
2. Clone this repo: `git clone https://github.com/josephyoon/uipath-typescript-getting-started`
3. Open Claude Code **inside the cloned repo** — this is important, it's what loads `CLAUDE.md` automatically
4. Have your UiPath account ready (org name and tenant from the URL, PAT token if you have one)

> **Why open inside the repo?** Claude Code automatically reads `CLAUDE.md` from the working directory. It contains all the SDK gotchas, the CORS proxy pattern, and the deploy pipeline — so Claude already knows the tricky parts before you hit them. You'll build your own versions in subdirectories alongside the reference examples.

**Starting prompt — paste this into Claude Code:**

> I want to learn how to use the `@uipath/uipath-typescript` SDK by building it from scratch. Start me with a Node.js hello world that connects to UiPath and lists my processes. My org is `{your-org}`, my tenant is `{your-tenant}`, and my environment is `{cloud/staging}`. I have a UiPath account but no PAT token yet — help me create one with the right scopes, then we'll write the code.

Claude will guide you through each step, help you debug errors as they come up, and explain what's happening along the way. Once the Node script works, ask to move on to the React UI, then the Coded App.

**The finished examples in this repo are reference implementations** — look at them when you're stuck, but try building each piece yourself first.

---

## What You'll Build

| Project | What it is |
|---|---|
| [`hello-uipath/`](hello-uipath/) | Node.js script — connect to UiPath and list processes |
| [`hello-uipath-ui/`](hello-uipath-ui/) | React + Vite app — browser UI with a local dev proxy |
| [`hello-uipath-coded-app/`](hello-uipath-coded-app/) | UiPath Coded Web App — deployed to Orchestrator with OAuth |

---

## Prerequisites

- Node.js 18+
- A UiPath account (staging or cloud)
- Your org name and tenant name from the URL: `https://cloud.uipath.com/{orgName}/{tenantName}`

---

## Part 1 — Node.js Hello World

### 1. Create a project

```bash
mkdir hello-uipath && cd hello-uipath
npm init -y
# Set "type": "module" in package.json
npm install @uipath/uipath-typescript tsx typescript dotenv
```

### 2. Create a Personal Access Token (PAT)

In UiPath Cloud: **Profile → Personal Access Tokens → Create**

Add these scopes:
- `OR.Execution.Read` — list processes
- `OR.Tasks.Read` — list tasks
- `OR.Folders.Read` — required for folder-scoped endpoints

### 3. Set up environment variables

```bash
# .env
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG=your-org
UIPATH_TENANT=your-tenant
UIPATH_SECRET=your-pat-token
```

### 4. Write the script

```typescript
// hello.ts
import 'dotenv/config';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';

const sdk = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL!,
  orgName: process.env.UIPATH_ORG!,
  tenantName: process.env.UIPATH_TENANT!,
  secret: process.env.UIPATH_SECRET!,
});

const result = await new Processes(sdk).getAll();

for (const p of result.items ?? []) {
  console.log(` - ${p.name}`);
}
```

### 5. Run it

```bash
npx tsx hello.ts
```

### Key things learned

**`getAll()` returns `{ items, totalCount }`** — not `{ value: [] }`. Using `.value` silently returns `undefined`, which falls through to `[]` via the `??` operator, making it look like no data exists.

**Service classes take the `sdk` instance in the constructor:**
```typescript
// Correct
const processes = new Processes(sdk);

// Wrong (deprecated dot-chain style)
sdk.processes.getAll();
```

**Import from subpaths, not the root:**
```typescript
import { Processes } from '@uipath/uipath-typescript/processes'; // correct
import { Processes } from '@uipath/uipath-typescript';           // wrong
```

---

## Part 2 — React UI with Local Dev Proxy

The browser blocks direct API calls to `cloud.uipath.com` due to CORS. The solution is a **Vite dev proxy** that forwards requests server-side.

### 1. Scaffold the project

```bash
npm create vite@latest hello-uipath-ui -- --template react-ts
cd hello-uipath-ui
npm install @uipath/uipath-typescript
```

### 2. Configure the Vite proxy

The SDK constructs URLs as `{baseUrl}/{orgName}/{tenantName}/...`. Because `normalizeBaseUrl` inside the SDK strips trailing slashes, the `baseUrl` you pass ends up being used literally as the base for URL resolution. This means the first path segment after the base will always be the org name — so proxy on that.

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        [`/${env.VITE_UIPATH_ORG}`]: {
          target: 'https://cloud.uipath.com',
          changeOrigin: true,
        },
      },
    },
  }
})
```

### 3. Configure the SDK

```typescript
const sdk = new UiPath({
  baseUrl: window.location.origin, // requests go to localhost, proxy forwards them
  orgName: import.meta.env.VITE_UIPATH_ORG,
  tenantName: import.meta.env.VITE_UIPATH_TENANT,
  secret: import.meta.env.VITE_UIPATH_SECRET,
});
```

### 4. Environment variables

```bash
# .env (never commit this)
VITE_UIPATH_ORG=your-org
VITE_UIPATH_TENANT=your-tenant
VITE_UIPATH_SECRET=your-pat-token
```

### Key things learned

**The SDK strips trailing slashes from `baseUrl`.** Adding a trailing slash to point at a subpath (e.g. `/uipath/`) doesn't work — the SDK normalizes it away before constructing request URLs. Proxy on the org name path instead.

**The proxy target should be the cloud host, not the full org URL.** The `changeOrigin: true` flag handles rewriting the Host header so the upstream server accepts the request.

---

## Part 3 — UiPath Coded App (Deployed to Orchestrator)

A Coded App is a React app hosted by UiPath. Auth is handled via OAuth — no PAT token or CORS proxy needed in production.

### 1. Install the UiPath CLI

```bash
npm install -g @uipath/cli
uip tools install @uipath/codedapp-tool
```

### 2. Create an OAuth External Application

Go to `https://cloud.uipath.com/{orgName}/portal_/admin/external-apps/oauth`:
- Click **Add application**
- Select **Non-Confidential application** (required for browser PKCE flow)
- Add scopes under **Orchestrator API Access**: `OR.Execution.Read`, `OR.Tasks.Read`
- Add redirect URI: `http://localhost:5173` (production URIs are registered automatically by `uip codedapp deploy`)
- Save and copy the **Application ID** (your Client ID)

### 3. Scaffold the project

```bash
npm create vite@latest hello-coded-app -- --template react-ts
cd hello-coded-app
npm install @uipath/uipath-typescript --@uipath:registry=https://registry.npmjs.org
npm install path-browserify tailwindcss@3 postcss autoprefixer
```

> The `--@uipath:registry` flag forces the SDK to install from the public npm registry, bypassing any GitHub Packages auth issues.

### 4. Configure `vite.config.ts`

Two requirements for Coded Apps:
- `base: './'` — the platform handles URL routing; the app must use relative asset paths
- `path-browserify` alias — the SDK uses Node's `path` module internally

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { global: 'globalThis' },
  resolve: { alias: { path: 'path-browserify' } },
  optimizeDeps: { include: ['@uipath/uipath-typescript'] },
})
```

> Do **not** add `server.proxy` here — it interferes with the OAuth callback.

### 5. Create `uipath.json`

This file is read by the `uip codedapp` CLI during pack and deploy:

```json
{
  "scope": "OR.Execution.Read OR.Tasks.Read",
  "clientId": "your-client-id"
}
```

### 6. Set up environment variables

```bash
# .env (never commit this)
VITE_UIPATH_CLIENT_ID=your-client-id
VITE_UIPATH_SCOPE=OR.Execution.Read OR.Tasks.Read
VITE_UIPATH_ORG_NAME=your-org
VITE_UIPATH_TENANT_NAME=your-tenant
VITE_UIPATH_BASE_URL=https://api.uipath.com
```

Base URL by environment:
| Environment | Base URL |
|---|---|
| Production | `https://api.uipath.com` |
| Staging | `https://staging.api.uipath.com` |
| Alpha | `https://alpha.api.uipath.com` |

### 7. Implement OAuth with `useAuth`

See [`hello-uipath-coded-app/src/hooks/useAuth.tsx`](hello-uipath-coded-app/src/hooks/useAuth.tsx) for a complete `AuthProvider` + `useAuth` hook using the SDK's PKCE OAuth flow.

Key SDK methods:
- `sdk.isInOAuthCallback()` — detect when the browser returns from UiPath login
- `sdk.completeOAuth()` — exchange the auth code for tokens
- `sdk.isAuthenticated()` — check if a valid token exists
- `sdk.initialize()` — trigger the login redirect

### 8. Deploy

```bash
# Log in to the UiPath CLI
uip login  # or: uip login --authority https://staging.uipath.com

# Build
npm run build

# Pack
uip codedapp pack dist -n your-app-name -v 1.0.0

# Publish
uip codedapp publish

# Deploy (requires a folder key from Orchestrator)
UIPATH_FOLDER_KEY=your-folder-key uip codedapp deploy
```

To find your folder key:
```bash
curl -H "Authorization: Bearer YOUR_PAT" \
  "https://cloud.uipath.com/{org}/{tenant}/orchestrator_/odata/Folders" \
  | python3 -c "import sys,json; [print(f['DisplayName'], f['Key']) for f in json.load(sys.stdin)['value']]"
```

### Key things learned

**`uipath` is a reserved word in app names.** Don't include it in the `--name` flag passed to `uip codedapp pack`.

**`base: './'` is required.** Without it, the built assets use absolute paths that break when served from UiPath's CDN subdirectory.

**OAuth redirect URI is computed at runtime.** The SDK derives it from `window.location.origin + window.location.pathname` — no need to set an env var. This means the same build works on both `localhost:5173` and the production CDN URL.

**`.uipath/*.nupkg` should be gitignored.** The `.uipath/` directory also contains `app.config.json` (deployment metadata) which is worth keeping, but the `.nupkg` binary is regenerated on each pack.

---

## Running the Examples Locally

### Part 1 — Node script

```bash
cd hello-uipath
cp .env.example .env  # fill in your values
npx tsx hello.ts
```

### Part 2 — React UI

```bash
cd hello-uipath-ui
cp .env.example .env  # fill in your values
npm install
npm run dev
# Open http://localhost:5173
```

### Part 3 — Coded App (local dev)

```bash
cd hello-uipath-coded-app
cp .env.example .env  # fill in your values
npm install
npm run dev
# Open http://localhost:5173 — it will redirect to UiPath login
```

---

## OAuth Scope Reference

| SDK service | Method | Required scope |
|---|---|---|
| `Processes` | `getAll()` | `OR.Execution.Read` |
| `Tasks` | `getAll()` | `OR.Tasks.Read` |
| `Jobs` | `getAll()` | `OR.Jobs.Read` |
| `Assets` | `getAll()` | `OR.Assets.Read` |
| `Buckets` | `getAll()` | `OR.Administration.Read` |
| `Jobs` | `getOutput()` | `OR.Jobs.Read` + `OR.Folders.Read` |
| Maestro processes/cases | any | `PIMS` |
| Conversational Agent | `startSession()` | `OR.Execution OR.Folders OR.Jobs ConversationalAgents Traces.Api` |

---

## Built With

- [`@uipath/uipath-typescript`](https://github.com/UiPath/uipath-typescript) — UiPath TypeScript SDK
- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Claude Code](https://claude.ai/code) — AI coding assistant used throughout
