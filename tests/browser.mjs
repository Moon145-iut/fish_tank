import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173')&&!r.url().startsWith('data:'))requests.push(r.url());});
const url=process.env.TEST_URL||'http://127.0.0.1:5173';
const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fishFriends:v1')));
const fish=async name=>(await save()).fish.find(f=>f.name===name);
const profile=page.locator('#fishPanel');
const select=name=>page.getByRole('button',{name:'Select '+name,exact:true}).click();
async function ready(){await page.waitForFunction(()=>window.__aquariumDiagnostics?.().ready);await page.waitForTimeout(300);}
async function screenshot(name){await page.screenshot({path:'artifacts/'+name+'.png',fullPage:true});}
async function noOverflow(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
async function feed(name){
 await select(name);const before=await fish(name);
 await profile.getByRole('button',{name:'✦ Feed',exact:true}).click();
 assert.equal((await fish(name)).totalFeeds,before.totalFeeds,'no stats before eating');
 assert.ok(await page.evaluate(()=>window.__aquariumDiagnostics().foodCount>0),'real food is in scene');
 assert.equal(await profile.getByRole('button',{name:'Snack incoming…'}).isDisabled(),true);
 await page.waitForFunction(({name,count})=>JSON.parse(localStorage.getItem('fishFriends:v1')).fish.find(f=>f.name===name)?.totalFeeds===count,{name,count:before.totalFeeds+1},{timeout:30000});
 const after=await fish(name);assert.equal(after.xp,before.xp+15);assert.ok(Math.abs(after.hunger-Math.max(0,before.hunger-35))<.1);assert.equal(after.history.filter(h=>h.type==='fed').length,before.history.filter(h=>h.type==='fed').length+1);
}
try{
 await mkdir('artifacts',{recursive:true});await page.goto(url);await ready();
 assert.deepEqual((await save()).fish.map(f=>f.name),['Rafi','Sami','Nila']);assert.equal(await page.locator('#attentionCount').textContent(),'1');
 await noOverflow();await screenshot('desktop-fresh');console.log('PASS fresh scene, three species, hungry alert, no overflow');
 const summary=page.getByRole('button',{name:'Rafi is hungry. Show feeding actions.'});
 await summary.focus();assert.ok(await page.locator('#attentionList').getByRole('button',{name:'✦ Feed',exact:true}).isVisible());
 await page.locator('#attentionList').getByRole('button',{name:'Don’t Feed',exact:true}).click();
 const beforeCancel=await fish('Rafi');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.deepEqual((await fish('Rafi')).history,beforeCancel.history);assert.equal((await fish('Rafi')).happiness,beforeCancel.happiness);
 await summary.click();await page.locator('#attentionList').getByRole('button',{name:'Don’t Feed',exact:true}).click();
 const reason=page.getByLabel('Please explain yourself');const submit=page.getByRole('button',{name:'Submit Excuse'});
 assert.equal(await submit.isDisabled(),true);await reason.fill('  ');assert.equal(await submit.isDisabled(),true);await reason.fill('He stole my fries');await submit.click();
 assert.equal((await fish('Rafi')).history[0].reason,'He stole my fries');assert.equal((await fish('Rafi')).totalRefusals,1);
 assert.ok(await profile.getByText('He stole my fries',{exact:true}).isVisible());assert.equal(await page.locator('#attentionCount').textContent(),'1');await screenshot('desktop-refusal');
 console.log('PASS refusal cancel, validation, exact reason, mood, history, hungry card');
 await page.locator('#dayToggle').click();await page.reload();await ready();assert.equal((await save()).preferences.night,true);assert.equal((await fish('Rafi')).history[0].reason,'He stole my fries');await screenshot('desktop-night');await page.locator('#dayToggle').click();
 await feed('Rafi');assert.equal(await page.locator('#attentionCount').textContent(),'0');await screenshot('desktop-fed');
 await feed('Sami');await feed('Nila');assert.equal((await save()).fish.reduce((s,f)=>s+f.totalFeeds,0),3);console.log('PASS physical feeding, exactly-once stats, three consecutive feeds, alert removal');
 await page.getByRole('button',{name:'Close fish profile'}).click();
 const coords=await page.evaluate(()=>window.__aquariumDiagnostics().fish.find(f=>f.name==='Rafi').screen);
 await page.mouse.click(coords.x,coords.y);await page.waitForTimeout(150);assert.equal(await profile.locator('.profile-name').textContent(),'Rafi');console.log('PASS real raycast fish selection');
 await page.getByRole('button',{name:'＋ Add a Friend',exact:true}).first().click();
 await page.getByLabel('Friend’s name').fill('Nico');await page.getByRole('radio',{name:'Guppy',exact:true}).check();await page.getByRole('button',{name:'Rose pink',exact:true}).click();await page.getByLabel('Personality',{exact:true}).selectOption('Sleepy');await page.getByRole('button',{name:'Release into the tank'}).click();
 assert.equal((await fish('Nico')).species,'guppy');assert.equal((await fish('Nico')).color,'#f48fa8');await profile.getByRole('button',{name:'✎ Edit Fish'}).click();await page.getByRole('radio',{name:'Pufferfish',exact:true}).check();await page.getByRole('button',{name:'Save changes',exact:true}).click();assert.equal((await fish('Nico')).species,'puffer');
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__aquariumDiagnostics().fish.find(f=>f.name==='Nico').species),'puffer');
 await profile.getByRole('button',{name:'✦ Feed',exact:true}).click();await profile.getByRole('button',{name:'Remove Fish',exact:true}).click();await page.locator('#modal').getByRole('button',{name:'Remove Fish',exact:true}).click();assert.equal(await fish('Nico'),undefined);
 await page.waitForTimeout(4000);assert.equal(await page.evaluate(()=>window.__aquariumDiagnostics().fish.some(f=>f.name==='Nico')),false);assert.equal(await page.evaluate(()=>window.__aquariumDiagnostics().foodCount),0);assert.equal((await save()).activity.filter(e=>e.name==='Nico'&&e.type==='fed').length,0);
 console.log('PASS add/edit/delete and removal during feed without orphan awards');
 await page.getByRole('button',{name:'↺ Reset camera'}).click();await noOverflow();
 await page.setViewportSize({width:768,height:1024});await page.waitForTimeout(500);await screenshot('tablet');await noOverflow();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await screenshot('mobile');await noOverflow();
 await page.getByRole('button',{name:'Aquarium settings'}).click();await page.getByRole('button',{name:'Reset Demo Aquarium'}).click();await page.getByRole('button',{name:'Reset aquarium',exact:true}).click();assert.equal((await fish('Rafi')).hunger,82);
 await page.locator('.attention-summary').click();assert.ok(await page.locator('#attentionList').getByRole('button',{name:'Don’t Feed',exact:true}).isVisible());
 await page.locator('#attentionList').getByRole('button',{name:'Don’t Feed',exact:true}).click();await page.getByLabel('Please explain yourself').fill('He stole my fries');await page.getByRole('button',{name:'Submit Excuse'}).click();await noOverflow();await screenshot('mobile-profile');
 await feed('Rafi');await page.locator('#tankNight').click();await page.reload();await ready();assert.equal((await save()).preferences.night,true);assert.equal((await fish('Rafi')).totalFeeds,1);assert.equal((await fish('Rafi')).history.find(h=>h.type==='refused').reason,'He stole my fries');
 await page.getByRole('button',{name:'＋ Add a Friend',exact:true}).first().click();await page.getByLabel('Friend’s name').fill('Nico');await page.getByRole('radio',{name:'Guppy',exact:true}).check();await screenshot('mobile-creator');await page.getByRole('button',{name:'Release into the tank'}).click();assert.ok(await fish('Nico'));await noOverflow();
 console.log('PASS tablet/mobile, touch-accessible actions, creation, feeding, refusal, reload, night mode, reset');
 await page.keyboard.press('Escape');await profile.getByRole('button',{name:'✎ Edit Fish'}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('#modal').isVisible(),false);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS no browser errors or external requests');
 console.log('ALL BROWSER CHECKS PASSED');
} catch(error){await screenshot('failure');console.error('BROWSER CHECK FAILED:',error);console.error('Browser errors:',errors);process.exitCode=1;}
finally{await browser.close();}

