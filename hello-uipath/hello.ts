import 'dotenv/config';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';

const sdk = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL!,
  orgName: process.env.UIPATH_ORG!,
  tenantName: process.env.UIPATH_TENANT!,
  secret: process.env.UIPATH_SECRET!,
});

const processes = new Processes(sdk);

const result = await processes.getAll();

console.log('Hello UiPath! Found processes:');
for (const p of result.items ?? []) {
  console.log(` - ${p.name}`);
}

if ((result.items ?? []).length === 0) {
  console.log(' (no processes found — but connection succeeded!)');
}
