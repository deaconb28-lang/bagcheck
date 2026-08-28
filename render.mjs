import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { seed } from "./scripts/seed.mjs";
const PORT=3161, BASE=`http://localhost:${PORT}`;
const OUT="/tmp/claude-0/-home-user-bagcheck/eeeaa50f-3f0a-5420-969d-00f5f230b545/scratchpad";
const { mongod, uri, userId } = await seed({ quiet:true, fresh:true });
const child = spawn(process.execPath,["node_modules/next/dist/bin/next","start","--port",String(PORT)],
 { env:{...process.env, NODE_ENV:"production", PORT:String(PORT), APP_LOCKED:"", APP_URL:BASE,
   MONGODB_URI:uri, MONGODB_DB:"supercruise", FINNHUB_API_KEY:"seeded-cache-only",
   DEV_USER_ID:userId, AUTH_SECRET:"", AUTH_GOOGLE_ID:"", AUTH_GOOGLE_SECRET:"" },
   stdio:["ignore","ignore","inherit"], detached:true });
for(let i=0;i<120;i++){try{const r=await fetch(BASE);if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
for(const [n,w,h,full] of [["g-default",1440,1200,false],["g-full",1440,1200,true],["g-phone",390,900,false]]){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2});
  await p.goto(`${BASE}/you`,{waitUntil:"domcontentloaded"});
  await p.waitForTimeout(2500);
  await p.screenshot({path:`${OUT}/${n}.png`, fullPage:full});
  await p.close();
}
await b.close();
try{process.kill(-child.pid,"SIGTERM");}catch{}
await mongod.stop();
console.log("DONE");
