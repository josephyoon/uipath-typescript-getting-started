# UiPath TypeScript SDK — Claude Code Context

This repo is a learning project. Someone is here to build hands-on experience with:
1. The `@uipath/uipath-typescript` SDK
2. Claude Code as a coding agent
3. Deploying a UiPath Coded Web App to Orchestrator

**Your role:** Guide them through building each part from scratch in a new directory. Don't just explain — write the code with them, run it, hit real errors, and fix them together. The finished examples in this repo are reference implementations; the learner should build their own versions.

---

## The Three Things to Build

Work through these in order. Each one builds on the previous.

### 1. Node.js Hello World (`hello-uipath/`)
Connect to UiPath with a PAT token and list processes. This proves the SDK works and teaches the basics before adding browser complexity.

### 2. React + Vite UI (`hello-uipath-ui/`)
Show the data in a browser. The main challenge here is CORS — the browser blocks direct API calls to UiPath. The solution is a Vite dev proxy.

### 3. UiPath Coded Web App (`hello-uipath-coded-app/`)
Deploy the app to Orchestrator so it's hosted by UiPath. Auth switches from PAT token to OAuth — no proxy needed in production.

---

## What the Learner Needs Before Starting

- Node.js 18+ and npm
- A UiPath account (staging or cloud)
- Their org name and tenant from the URL: `https://cloud.uipath.com/{orgName}/{tenantName}`
- A Personal Access Token — ask them to create one before writing any code

**Help them find their org/tenant:** It's the two path segments in the URL after the domain when they're logged in.

**Help them create a PAT:** UiPath Cloud → profile icon (top right) → Personal Access Tokens → Create. They'll need `OR.Execution.Read` and `OR.Tasks.Read` scopes to start. `OR.Folders.Read` is also needed for some endpoints — add it preemptively.

---

## SDK Fundamentals — Know These Before You Start

These are the non-obvious things that will cause silent failures if you don't know them.

### `getAll()` returns `{ items, totalCount }` — not `{ value: [] }`
```typescript
const result = await new Processes(sdk).getAll();
result.items   // ✓ the array
result.value   // ✗ undefined — silently returns nothing, looks like empty data
```

### Import from subpaths
```typescript
import { Processes } from '@uipath/uipath-typescript/processes'; // ✓
import { Processes } from '@uipath/uipath-typescript';           // ✗
```

### Constructor injection, not dot-chain
```typescript
const processes = new Processes(sdk); // ✓
sdk.processes.getAll();               // ✗ deprecated
```

### The SDK strips trailing slashes from `baseUrl`
`normalizeBaseUrl()` inside the SDK removes trailing slashes before constructing request URLs. This matters for the CORS proxy setup — see below.

---

## The CORS Proxy — How It Works and Why

The browser blocks requests from `localhost:5173` to `cloud.uipath.com`. Solution: Vite proxies requests through its own dev server (server-to-server, no CORS).

**The tricky part:** The SDK builds URLs as `new URL(orgName/tenantName/..., baseUrl)`. Because the SDK strips trailing slashes, you can't use a subpath prefix like `/proxy/` — it gets stripped and the URL resolves wrong. Instead, proxy on the org name:

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        [`/${env.VITE_UIPATH_ORG}`]: {   // proxy on orgName, not a custom prefix
          target: 'https://cloud.uipath.com',
          changeOrigin: true,
        },
      },
    },
  }
})
```

```typescript
// App.tsx
const sdk = new UiPath({
  baseUrl: window.location.origin,  // SDK builds: origin/orgName/tenantName/...
  orgName: import.meta.env.VITE_UIPATH_ORG,
  tenantName: import.meta.env.VITE_UIPATH_TENANT,
  secret: import.meta.env.VITE_UIPATH_SECRET,
});
```

---

## Coded App — Key Differences from the Local Dev App

| | Local dev app | Coded App |
|---|---|---|
| Auth | PAT token (`secret:`) | OAuth PKCE (`clientId`, `scope`, `redirectUri`) |
| CORS | Vite proxy | Not needed — app is served from UiPath's domain |
| `vite.config.ts` | Has `server.proxy` | Has `base: './'`, no proxy |
| Base URL | `https://cloud.uipath.com` | `https://api.uipath.com` (API subdomain) |

**`base: './'` is required.** Without it, built assets use absolute paths that break on UiPath's CDN.

**`uipath` is a reserved word in app names.** Don't use it in the `--name` flag to `uip codedapp pack`.

**The redirect URI is computed at runtime** from `window.location.origin + window.location.pathname`. The same build works on `localhost:5173` and the production CDN URL — don't hardcode it.

**Base URL uses the API subdomain:**
- Production: `https://api.uipath.com`
- Staging: `https://staging.api.uipath.com`

---

## OAuth Scopes

| What the app does | Scopes needed |
|---|---|
| List processes | `OR.Execution.Read` |
| List tasks | `OR.Tasks.Read` |
| List jobs | `OR.Jobs.Read` |
| Get job output | `OR.Jobs.Read OR.Folders.Read` |
| Start a process | `OR.Execution OR.Jobs` |
| Maestro processes/cases | `PIMS` |
| Conversational Agent | `OR.Execution OR.Folders OR.Jobs ConversationalAgents Traces.Api` |

For the External Application in the portal, all `OR.*` scopes are under **Orchestrator API Access**.

---

## Deploy Pipeline

```bash
uip login                                        # or --authority https://staging.uipath.com
npm run build                                    # produces dist/
uip codedapp pack dist -n my-app-name -v 1.0.0  # produces .uipath/*.nupkg
uip codedapp publish                             # registers in Orchestrator
UIPATH_FOLDER_KEY=<key> uip codedapp deploy      # goes live, prints the URL
```

**Finding the folder key:**
```bash
curl -H "Authorization: Bearer YOUR_PAT" \
  "https://cloud.uipath.com/{org}/{tenant}/orchestrator_/odata/Folders" \
  | python3 -c "import sys,json; [print(f['DisplayName'], f['Key']) for f in json.load(sys.stdin)['value']]"
```

**Bump the version** (`-v 1.0.1`, etc.) if you need to re-publish — same version will be rejected.

---

## Errors You Will Hit and How to Fix Them

| Error | Cause | Fix |
|---|---|---|
| `AuthorizationError: 403` | PAT token missing scopes or `OR.Folders.Read` | Add missing scopes to the PAT |
| `NetworkError: Failed to fetch` + CORS in console | Browser blocking direct API call | Add Vite proxy |
| `SyntaxError: Unexpected token '<'` | Proxy returning HTML instead of JSON | SDK stripped trailing slash — proxy on orgName path, not a subpath prefix |
| No data shown, no error | Using `result.value` instead of `result.items` | Change to `result.items` |
| `Name is reserved` on deploy | App name contains `uipath` | Choose a different name |
| `dist/ not found` on pack | Forgot to build | Run `npm run build` first |
| `Version already exists` on publish | Same version re-published | Bump the version number |
| Folder key required on deploy | `UIPATH_FOLDER_KEY` not set | List folders with curl, set the env var |
