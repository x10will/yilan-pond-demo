// Farm static-build service worker template, derived from vendor/panel-core/sw.js
// (84fc525). app_build.worker() fills in BUILD and ASSETS exactly as for the vendored
// template; build_static.py first fills in FARM_BUILD, DT_PATH and HASHES, so BUILD (the
// cache name) covers them too.
//
// One build, never two (gate review of #109, 2026-09-27, Majors 1-3):
// - The DT tree is published under dt/<id>/, where <id> is derived from its bytes. A page of
//   this build only asks for dt/<id>/ URLs, and only those are runtime-cached here, so
//   neither a page nor this cache can take another build's viewer code, GLBs or frames.
// - Every precached file (the shell, deployment-config.js, the canonical candidate and the
//   generation inventory) is checked against the SHA-256 this build recorded for it, and must
//   be a same-origin 200 that was not redirected. One bad file fails the install.
// - When this worker replaces an older build, the tabs that were open under it are refused
//   everything in scope until they reload, and every tab is told this worker's build; a page
//   whose own build differs reloads (app.js).
// Network fetches bypass/revalidate the browser HTTP cache (reload for precache/modules,
// no-cache for other runtime assets), so max-age cannot pin stale bytes or module MIME. api/ is
// never cached.
const BASE=new URL('./',self.location.href);
const BUILD='353200622a912915';
const FARM_BUILD='85902d8a673e609e';
const AUTO_UPDATE=true;
const PREFIX='panel-core-'+encodeURIComponent(BASE.pathname)+'-';
const CACHE=PREFIX+BUILD;
const RUNTIME=PREFIX+'dt-'+BUILD;
const ASSETS=["./", "./app.js", "./deployment-config.js", "./dt/cd815957cfa92530/generation/inventory.json", "./farm-panel.css", "./farm-shell.js", "./icons/pond-192.png", "./icons/pond-512.png", "./icons/pond-apple-touch.png", "./icons/pond-maskable-512.png", "./index.html", "./manifest.js", "./manifest.webmanifest", "./map-ext/pond-labels.js", "./map-ext/pond-world.js", "./panels/farm-data.js", "./panels/notifications.js", "./panels/panel-candidate.js", "./panels/pond-ai-narration.js", "./panels/pond-ai.css", "./panels/pond-inspection.js", "./panels/pond-live-ai.js", "./panels/pond-presenter.js", "./panels/pond-shell.js", "./panels/pond.js", "./panels/provenance.js", "./panels/scenario.js", "./panels/telemetry.js", "./site-identity.js", "./site.js", "./vendor/panel-core/GRIDSTACK_LICENSE.txt", "./vendor/panel-core/THIRD_PARTY_LICENSES.md", "./vendor/panel-core/core.css", "./vendor/panel-core/core.js", "./vendor/panel-core/map-client.js"];
const HASHES={"./": "8971443813a116fa4a610849fb6770737e511350892dd02798228f16e4ce2af9", "./app.js": "83cf94bd3c46ac17cce83731b63163bf41344ab8853b3f0216bb50719264e3d6", "./deployment-config.js": "b3142a14ade7e74914566818a3a58f43d971f53555166dab786c29804e43676d", "./dt/cd815957cfa92530/generation/inventory.json": "9e4175b222222aec8a4f761ceca04889f702de03ad6714f52fa0250883290bed", "./farm-panel.css": "839a52df250067d1859ab673b5188f4231d949696ff48c25a5454a62633746a2", "./farm-shell.js": "66b40b5b35e6921da76362aecee5ab38523af83aeed4eec3133cdc88cbc6e825", "./icons/pond-192.png": "bdb819bc398f33949e9336d6e5325fe2c89aa16e025ed584af933895a39f6fa4", "./icons/pond-512.png": "e11a042cd8f82889d5b987a09be93b272bbfe7098c5c85299aabf7278393ee8c", "./icons/pond-apple-touch.png": "af41dcf4ab57063fd9b28e16427962b5af1f80be462c00f5d4bfe2cc7962e917", "./icons/pond-maskable-512.png": "e11a042cd8f82889d5b987a09be93b272bbfe7098c5c85299aabf7278393ee8c", "./index.html": "8971443813a116fa4a610849fb6770737e511350892dd02798228f16e4ce2af9", "./manifest.js": "1553f4507cbf27beaeae84fd0cadb3bf5c3752e52ae1fe2a7a607fbd8039ef27", "./manifest.webmanifest": "38cf575368cc5ec1a1d9d5ddbbd80988becbc899ce4c2c8a62f34fb65432a56b", "./map-ext/pond-labels.js": "9f2e6e3c893eaa92c14b8198243b0a60097bf39ce745ef89deb3295c3b35236f", "./map-ext/pond-world.js": "c2c402103a733bc5ad8c0bc839672f83faa2e349594fed4b77a05902dcc74bc3", "./panels/farm-data.js": "a864912dbc75da9fef4db46347999f45f1aa30b0649bb4a3fb77b070d0021546", "./panels/notifications.js": "dbea0c65df0ef7d4d625e5ec63346dff15db468e64d66d2ca9ab533861270c45", "./panels/panel-candidate.js": "fa9d362c2d9e5ebb469137ce3ac319369fa5fc33cc6987f0161a4efffb5d2d48", "./panels/pond-ai-narration.js": "6741ba440a432808d797c7252993e01a6d60316963e4726bd6fdd9ba6f7967cf", "./panels/pond-ai.css": "90a04042a49b726b596345707bca006d450aa66d89fb8b7aa604692b00059f9a", "./panels/pond-inspection.js": "711d268ca71a849bb2058508a1bc7a36b0df9db86d39727a87c63dc61f2253e5", "./panels/pond-live-ai.js": "dd2f29dbe08e03769e30042fb70dd7632bd7933e5a9b8b21ececbb59e458d7a4", "./panels/pond-presenter.js": "e8892ee791f5dd323479438cac26bc7f70b4b1e78117767f6a1b686061e5b537", "./panels/pond-shell.js": "accd8d1fb153a9f265f9e6dc3a18734bfaa92ec5948f9d2c6c2dee6a5c0b514c", "./panels/pond.js": "0661f4e2e92d72825d5ad8cb5bfe60ec308f83973fe63b961771e172b7eae1d0", "./panels/provenance.js": "e3fd179fda5c740faf581c586ea31306f48be8e57806636c9ee5a96d5e930532", "./panels/scenario.js": "ade8c64acf43f5fecfb723bc90c141a2f6e7c3e2419e0228b639857a60b9e7ef", "./panels/telemetry.js": "1d11fd96f804aa7219451edf533643eaf5e00bf1ed9e48df4c6b256491f43819", "./site-identity.js": "2ea43140a2b0f10364c9e49dc93a1a49a034ea382952e9aa38de86ccf83c07a0", "./site.js": "fa626770022fce8016abb482197b4ab9fb080a92e2e17211b7d4d9b465cbfdbb", "./vendor/panel-core/GRIDSTACK_LICENSE.txt": "28d28a6e0b5c6ebca8759b162a644c31cea28aab591060c0d95c7737d8456764", "./vendor/panel-core/THIRD_PARTY_LICENSES.md": "49ae6d444c5a08201f546ba2e14077ac4af6a5696cafd77d477ccdb97dce731c", "./vendor/panel-core/core.css": "472b46d96ebc0ba62ad93e8f9fc7e8916c36bd6f6d1c734c152648cc83bf8476", "./vendor/panel-core/core.js": "7659dd618ecc8c595086f1a6058430ec11079ce3d8cdf4cdb41b13fb66d21004", "./vendor/panel-core/map-client.js": "31fbab87fb9d7bc8d7639771e984856c54f70f57ac983ab421ee7e3033dfb987"};
const DT_PATH='dt/cd815957cfa92530/';
const DT=new URL(DT_PATH,BASE).href;
const REPLACING=new URL('__farm-replacing',BASE).href;
const STALE=new Set();
// Will's 2026-10-04 operator repro: text/plain modules can survive hard reloads.
// Validate both fresh and previously stored responses; a 200 alone cannot boot a module.
const MIME={
  js:['text/javascript','application/javascript','application/x-javascript','text/ecmascript','application/ecmascript'],
  mjs:['text/javascript','application/javascript','application/x-javascript','text/ecmascript','application/ecmascript'],
  html:['text/html'],css:['text/css'],json:['application/json'],jsonld:['application/ld+json','application/json'],
  webmanifest:['application/manifest+json','application/json'],
  glb:['model/gltf-binary','application/octet-stream'],gltf:['model/gltf+json','application/json'],bin:['application/octet-stream'],
  wasm:['application/wasm'],png:['image/png'],jpg:['image/jpeg'],jpeg:['image/jpeg'],
  svg:['image/svg+xml'],webp:['image/webp'],gif:['image/gif'],ico:['image/vnd.microsoft.icon','image/x-icon'],
  md:['text/markdown','text/plain'],txt:['text/plain'],
};
function cacheable(response,path,cached=false){
  if(!response?.ok||response.status!==200||response.redirected||
     !['basic',...(cached?['default']:[])].includes(response.type))return false;
  const pathname=new URL(path,BASE).pathname;
  const extension=pathname.endsWith('/')?'html':pathname.split('.').pop().toLowerCase();
  const type=(response.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase();
  return MIME[extension]?MIME[extension].includes(type):!!type;
}
const hex=buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
// A precached file, fetched and checked: same-origin 200, not redirected, and the bytes this build recorded.
async function verified(path,mode){
  const url=new URL(path,BASE).href;
  const response=await fetch(url,{cache:mode,credentials:'same-origin'});
  if(!cacheable(response,path))throw new Error(`${path}: HTTP ${response.status} or invalid Content-Type ${response.headers.get('Content-Type')||'(missing)'}`);
  const body=await response.arrayBuffer();
  if(hex(await crypto.subtle.digest('SHA-256',body))!==HASHES[path])throw new Error(`${path}: bytes are not this build's`);
  return new Response(body,{status:200,statusText:response.statusText,headers:response.headers});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const entries=await Promise.all(ASSETS.map(async path=>[new URL(path,BASE).href,await verified(path,'reload')]));
  for(const [url,response] of entries)await cache.put(url,response);
  if(self.registration.active)await cache.put(REPLACING,new Response('1'));
  // Pond presenters get the republished generation on their next visit without
  // retaining the old worker behind an update button. The 六堆 flow stays opt-in.
  if(AUTO_UPDATE)await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE&&k!==RUNTIME).map(k=>caches.delete(k)));
  const cache=await caches.open(CACHE);
  const open=await self.clients.matchAll({includeUncontrolled:true});
  if(await cache.match(REPLACING)){for(const client of open)STALE.add(client.id);await cache.delete(REPLACING);}
  await self.clients.claim();
  for(const client of open)if(client.frameType==='top-level')client.postMessage({type:'FARM_BUILD',build:FARM_BUILD});
})()));
async function runtime(request){
  const cache=await caches.open(RUNTIME);
  let cached=await cache.match(request);
  if(cached&&!cacheable(cached,request.url,true)){await cache.delete(request);cached=null;}
  const module=/\.(?:m?js)$/i.test(new URL(request.url).pathname);
  if(cached&&!module)return cached;
  try{
    // Revalidate modules, including their MIME type. Immutable geometry/data can
    // still use the build-scoped cache without another large transfer.
    // reload also replaces stale HTTP-cache headers after a server fixes its MIME
    // configuration without changing the module bytes or Last-Modified value.
    const response=await fetch(request.url,{cache:module?'reload':'no-cache',credentials:'same-origin'});
    if(cacheable(response,request.url)){await cache.put(request.url,response.clone());return response;}
    return cached||response;
  }catch(error){if(cached)return cached;throw error;}
}
async function warm(urls){
  const cache=await caches.open(RUNTIME),shell=await caches.open(CACHE);
  for(const url of urls){
    if(typeof url!=='string'||!url.startsWith(DT)||await shell.match(url,{ignoreSearch:true}))continue;
    const stored=await cache.match(url);
    if(stored&&cacheable(stored,url,true))continue;
    if(stored)await cache.delete(url);
    try{const response=await fetch(url,{cache:/\.(?:m?js)$/i.test(new URL(url).pathname)?'reload':'no-cache',credentials:'same-origin'});if(cacheable(response,url))await cache.put(url,response);}catch{}
  }
}
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='FARM_BUILD?')event.source?.postMessage({type:'FARM_BUILD',build:FARM_BUILD});
  if(event.data?.type==='FARM_WARM'&&Array.isArray(event.data.urls))event.waitUntil(warm(event.data.urls));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
  const relative=url.pathname.slice(BASE.pathname.length);
  if(relative.startsWith('api/')||relative.startsWith('__test__/')||relative==='healthz'||relative==='sw.js')return;
  // A tab opened under the build this worker replaced gets nothing until it reloads. Its
  // reload is a navigation, which Chrome tags with the old tab's clientId, so it is let through.
  if(event.request.mode!=='navigate'&&STALE.has(event.clientId)){event.respondWith(Response.error());return;}
  // Positive static-asset allow-list: no API or arbitrary response is cached.
  const path=relative===''?'./':'./'+relative;
  const known=ASSETS.includes(path);
  if(!known&&relative.startsWith(DT_PATH)){event.respondWith(runtime(event.request));return;}
  if(!known)return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const key=new URL(path,BASE).href;
    const cached=await cache.match(key);if(cached&&cacheable(cached,path,true))return cached;
    if(cached)await cache.delete(key);
    // Evicted: refetch, but only this build's bytes are served or stored.
    try{const response=await verified(path,'reload');await cache.put(new URL(path,BASE).href,response.clone());return response;}
    catch{return Response.error();}
  }));
});
