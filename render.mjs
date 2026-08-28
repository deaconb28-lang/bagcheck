import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { seed } from "./scripts/seed.mjs";
const PORT=3141, BASE=`http://localhost:${PORT}`;
const OUT="/tmp/claude-0/-home-user-bagcheck/eeeaa50f-3f0a-5420-969d-00f5f230b545/scratchpad";
console.log("seeding…");
const { mongod, uri, userId } = await seed({ quiet:true, fresh:true });
console.log("booting…");
const child = spawn(process.execPath,["node_modules/next/dist/bin/next","start","--port",String(PORT)],
 { env:{...process.env, NODE_ENV:"production", PORT:String(PORT), APP_LOCKED:"", APP_URL:BASE,
   MONGODB_URI:uri, MONGODB_DB:"supercruise", FINNHUB_API_KEY:"seeded-cache-only",
   DEV_USER_ID:userId, AUTH_SECRET:"", AUTH_GOOGLE_ID:"", AUTH_GOOGLE_SECRET:"" },
   stdio:["ignore","ignore","inherit"], detached:true });
let up=false;
for(let i=0;i<120;i++){try{const r=await fetch(BASE);if(r.ok){up=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
console.log("server up:", up);
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const shots=[["r-dark","dark",1440,1100,"/you"],["r-light","light",1440,1100,"/you"],
             ["r-phone","dark",390,844,"/you"],["r-dark-full","dark",1440,1100,"/you"]];
for(const [n,m,w,h,path] of shots){
  const p=await b.newPage({viewport:{width:w,height:h},colorScheme:m,deviceScaleFactor:2});
  await p.goto(`${BASE}${path}`,{waitUntil:"domcontentloaded"});
  await p.waitForTimeout(2500);
  await p.screenshot({path:`${OUT}/${n}.png`, fullPage: n.endsWith("full")});
  console.log(n, p.url());
  await p.close();
}
await b.close();
try{process.kill(-child.pid,"SIGTERM");}catch{}
await mongod.stop();
console.log("DONE");
