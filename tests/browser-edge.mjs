import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {demoState,makeFish,COLORS} from '../src/game/defaults.js';
const browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const url=process.env.TEST_URL||'http://127.0.0.1:5173';
const errors=[];
async function setup(state,options={}){
 const context=await browser.newContext({viewport:{width:1440,height:900},...options});
 if(state)await context.addInitScript(data=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('fishFriends:v1',JSON.stringify(data));sessionStorage.setItem('seeded','yes');}},state);
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));return {context,page};
}
async function ready(page){await page.waitForFunction(()=>window.__aquariumDiagnostics?.().ready);}
try{
 const empty={...demoState(Date.now()),fish:[],activity:[]};
 const a=await setup(empty);await a.page.goto(url);await ready(a.page);assert.equal(await a.page.locator('#emptyTank').isVisible(),true);await a.page.reload();await ready(a.page);assert.equal(await a.page.locator('.fish-row').count(),0);await a.context.close();
 console.log('PASS empty aquarium survives reload');
 const full=demoState(Date.now());full.fish=Array.from({length:12},(_,i)=>({...makeFish({name:i===0?'<img src=x onerror=bad>':i===1?'🐟 Very Long Fish Friend':'Duplicate',species:['puffer','guppy','angel'][i%3],personality:['Greedy','Dramatic','Sleepy','Chaotic','Sweet'][i%5],color:COLORS[i%8],accent:'#f4c3e4',tagline:'<script>not code</script>'},Date.now(),'stress-'+i),xp:210,hunger:82}));
 const b=await setup(full);await b.page.goto(url);await ready(b.page);assert.equal(await b.page.locator('.fish-row').count(),12);assert.equal(await b.page.locator('#addFishTop').isDisabled(),true);assert.equal(await b.page.locator('#fishList img').count(),0);await b.page.waitForTimeout(3500);
 let diagnostics=await b.page.evaluate(()=>window.__aquariumDiagnostics());assert.equal(diagnostics.fish.length,12);assert.ok(diagnostics.fish.every(f=>Math.abs(f.scale-1.55)<1e-9&&f.position.every(Number.isFinite)));
 await b.page.screenshot({path:'artifacts/twelve-fish.png',fullPage:true});
 await b.page.getByRole('button',{name:'Select '+full.fish[2].name,exact:true}).first().click();
 // Select the max-size angelfish explicitly by stable ID (duplicate names are allowed).
 await b.page.locator('[data-fish-id="stress-2"]').click();await b.page.locator('#fishPanel').getByRole('button',{name:'✦ Feed',exact:true}).click();
 await b.page.waitForFunction(()=>JSON.parse(localStorage.getItem('fishFriends:v1')).fish.find(f=>f.id==='stress-2').totalFeeds===1,null,{timeout:30000});
 assert.equal(await b.page.evaluate(()=>window.__aquariumDiagnostics().foodCount),0);
 await b.page.setViewportSize({width:390,height:844});await b.page.waitForTimeout(500);diagnostics=await b.page.evaluate(()=>window.__aquariumDiagnostics());assert.ok(diagnostics.fish.every(f=>Math.abs(f.position[0])<3.7));assert.equal(await b.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await b.context.close();console.log('PASS 12 full-grown fish, duplicate/emoji/HTML names, safe text, max-size feeding, mobile bounds');
 const c=await setup(null,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await c.page.goto(url);await ready(c.page);await c.page.locator('.attention-summary').tap();await c.page.locator('#attentionList').getByRole('button',{name:'Don’t Feed',exact:true}).tap();await c.page.getByLabel('Please explain yourself').fill('<img src=x onerror=alert(1)>');await c.page.getByRole('button',{name:'Submit Excuse'}).tap();
 assert.equal(await c.page.locator('#fishPanel img').count(),0);assert.ok(await c.page.getByText('<img src=x onerror=alert(1)>',{exact:true}).isVisible());
 await c.page.locator('#addFishTop').tap();await c.page.keyboard.press('Escape');assert.equal(await c.page.evaluate(()=>document.activeElement.id),'addFishTop');await c.context.close();console.log('PASS real touch input, reduced-motion mode, text-only excuses, Escape focus restoration');
 const d=await setup();await d.context.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});await d.page.goto(url);await ready(d.page);assert.ok((await d.page.locator('#saveStatus').textContent()).includes('Storage unavailable'));assert.equal(await d.page.locator('.fish-row').count(),3);await d.context.close();console.log('PASS blocked storage gives an intentional playable fallback');
 const e=await setup();await e.context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){if(kind.startsWith('webgl'))return null;return get.call(this,kind,...rest);};});await e.page.goto(url);await e.page.getByText('The water needs a little help.').waitFor();assert.equal(await e.page.locator('.fish-row').count(),3);assert.equal(await e.page.locator('#attentionList .primary').isDisabled(),true);await e.page.screenshot({path:'artifacts/webgl-fallback.png',fullPage:true});await e.context.close();console.log('PASS WebGL unavailable fallback, roster preserved, feeding disabled');
 const f=await setup();await f.page.goto(url);await ready(f.page);const coords=await f.page.evaluate(()=>window.__aquariumDiagnostics().fish[0].screen);await f.page.mouse.move(coords.x,coords.y);await f.page.mouse.down();await f.page.mouse.move(coords.x+70,coords.y+30,{steps:8});await f.page.mouse.up();assert.equal(await f.page.locator('#fishPanel').isVisible(),false);
 await f.page.getByRole('button',{name:'Select Rafi',exact:true}).click();await f.page.locator('#fishPanel').getByRole('button',{name:'✦ Feed',exact:true}).click();
 await f.page.evaluate(()=>document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await f.page.getByText('The water needs a little help.').waitFor();assert.equal(await f.page.evaluate(()=>JSON.parse(localStorage.getItem('fishFriends:v1')).fish[0].totalFeeds),0);await f.context.close();console.log('PASS camera drag does not select and context loss never awards incomplete food');
 assert.deepEqual(errors,[]);console.log('ALL EDGE CASE CHECKS PASSED');
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}


