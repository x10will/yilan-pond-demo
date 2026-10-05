import {createApp} from 'panel-core';
// Load the local site record before evaluating site-dependent panel modules.
if (!globalThis.FARM_DEPLOYMENT) {
 try { const response=await fetch(new URL('./runtime.local.json',import.meta.url));
  if(response.ok)globalThis.FARM_DEPLOYMENT=await response.json(); } catch {}
}
const {siteFrom, replayPosition} = await import('./site.js');
const [{manifest}, {installFarmShell, restorePhoneOverview}, {canonicalAdapter, frameIndexAt},
 {current}] = await Promise.all([
 import('./manifest.js'), import('./farm-shell.js'), import('./panels/farm-data.js'), import('./panels/scenario.js'),
]);
const site = siteFrom();
const {applySiteIdentity} = await import('./site-identity.js');
applySiteIdentity(site);
document.documentElement.dataset.farmSite = site.site_id;
if (site.presentation?.kind === 'pond-night') document.documentElement.dataset.pondUi = 'true';
if (site.site_id !== 'farm') {
 let position = {time: 0, rate: manifest.clock.rate};
 if (site.presentation?.kind === 'pond-night') {
  try {
   const {adapter} = await canonicalAdapter();
   manifest.clock = {...manifest.clock, duration: adapter.durationSeconds * 1000};
  } catch { /* The panels present candidate verification errors. */ }
  position = replayPosition(globalThis.location?.search, manifest.clock);
  manifest.clock = {...manifest.clock, rate: position.rate};
 }
 window.app=createApp(document.querySelector('#app'),manifest);
 applySiteIdentity(site);
 window.app.clock.pause();
 window.app.clock.seek(position.time);
 installFarmShell(document.querySelector('#app'),window.app);
 if (site.presentation?.kind === 'pond-night') {
  const {installPondShell} = await import('./panels/pond-shell.js');
  installPondShell(document.querySelector('#app'),window.app);
  const {installPondLiveAI} = await import('./panels/pond-live-ai.js');
  void installPondLiveAI(document.querySelector('#app'),window.app);
 }
}
globalThis.__farmBoot?.watch(window.app);
if('serviceWorker' in navigator&&!globalThis.__farmBoot?.recovering){
 // One build per tab (gate review of #109, 2026-09-27, Major 2): whenever a worker takes this
 // tab, ask for its build; a tab whose own build differs saves its layout and reloads, so no tab
 // keeps an old shell under a new build's worker. The static build's worker also tells every
 // open tab its build when it activates, and refuses the tabs it replaced until they reload.
 // Listening starts before registering, so a message sent at activation is never missed.
 const build=globalThis.FARM_DEPLOYMENT?.build;
 let updateRequested=false,refreshing=false;
 const reload=()=>{if(refreshing)return;refreshing=true;try{window.app.save();}catch{}location.reload();};
 const ask=()=>{if(build)navigator.serviceWorker.controller?.postMessage({type:'FARM_BUILD?'});};
 navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='FARM_BUILD'&&build&&event.data.build!==build)reload();});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updateRequested)reload();else ask();});
 ask();
 navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{scope:'./',updateViaCache:'none'}).then(reg=>{
  if(globalThis.__farmBoot?.recovering){void reg.unregister();return;}
  if(site.presentation?.kind==='pond-night')void reg.update().catch(()=>{});
  function offer(worker){
   if(!worker||!navigator.serviceWorker.controller)return;
   const button=document.createElement('button');button.className='update-button';button.textContent=site.presentation?.kind === 'pond-night' ? '有新版示範 · 重新載入' : 'Update available · Reload';
   button.onclick=()=>{window.app.save();updateRequested=true;worker.postMessage({type:'SKIP_WAITING'});};document.body.append(button);
  }
  offer(reg.waiting);reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offer(reg.waiting);});});
 }).catch(()=>{});
}
