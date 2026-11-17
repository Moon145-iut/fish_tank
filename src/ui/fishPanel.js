import {el,button,avatar,meter,timeAgo,$} from './dom.js';
import {SPECIES,PERSONALITIES} from '../game/defaults.js';
import {fishStatus,hungerLabel,growthProgress,growthScale} from '../game/rules.js';

export function createFishPanel(store,actions){
 const panel=$('#fishPanel');
 function render(){
  const fish=store.find(store.selectedId);panel.hidden=!fish;if(!fish){panel.replaceChildren();return;}
  const scroll=panel.scrollTop;panel.replaceChildren();const top=el('div','panel-top');
  top.append(el('span','eyebrow','YOUR LITTLE MAIN CHARACTER'),button('×','icon-button panel-close',actions.close,{'aria-label':'Close fish profile','data-key':'close-profile'}));
  const main=el('div','profile-main'),side=el('div','profile-side'),identity=el('div','profile-identity'),title=el('div');
  title.append(el('h2','profile-name',fish.name),el('p','profile-sub',SPECIES[fish.species]+' · '+fish.personality));identity.append(avatar(fish),title);main.append(identity);
  if(fish.tagline)main.append(el('p','tagline','“'+fish.tagline+'”'));
  main.append(el('span','profile-status',fishStatus(fish,store.runtime(fish.id))));
  const stat=(name,value,kind,label)=>{const group=el('div','stat'),heading=el('div','stat-label');heading.append(el('span','',name),el('strong','',Math.round(value)+'/100 — '+label));group.append(heading,meter(value,kind,name));return group;};
  main.append(stat('Hunger',fish.hunger,'hunger',hungerLabel(fish.hunger)),stat('Health',fish.health,'health',fish.health>=80?'Healthy':'Needs care'),stat('Happiness',fish.happiness,'mood',fish.happiness>=70?'Happy':fish.happiness>=40?'Okay':'Grumpy'));
  const growth=growthProgress(fish.xp),growthCard=el('div','growth-card'),growthTitle=el('div');
  growthTitle.append(el('strong','',growth.stage.name),el('span','',Math.round(growthScale(fish.xp)*100)+'% size'));
  growthCard.append(growthTitle,meter(growth.percent,'growth','Growth to next stage'),el('small','',fish.xp+' XP'+(growth.next?' / '+growth.next.minXP+' for next stage':' · Maximum stage')+' · '+fish.totalFeeds+' meals'));main.append(growthCard);
  const controls=el('div','profile-actions'),busy=store.isFeeding(fish.id);
  const feed=button(busy?'Snack incoming…':fish.hunger<10?'Already full':'✦ Feed','button primary',()=>actions.feed(fish.id),{'data-key':'panel-feed-'+fish.id});
  feed.disabled=busy||fish.hunger<10||!actions.canAnimate();
  feed.title=!actions.canAnimate()?'Graphics need to be available for the feeding animation.':fish.hunger<10?'Already full. Let that little belly settle.':'Drop a snack into the tank';
  const refuse=button('Don’t Feed','button quiet',()=>actions.refuse(fish.id),{'data-key':'panel-refuse-'+fish.id});refuse.disabled=busy||fish.hunger<65;refuse.title=fish.hunger<65?'Excuses are for hungry fish (65+ hunger).':'They deserve an explanation.';
  controls.append(feed,refuse);side.append(controls);
  const manage=el('div','management-actions'),edit=button('✎ Edit Fish','text-button',()=>actions.edit(fish.id),{'data-key':'edit-'+fish.id});
  edit.disabled=busy;manage.append(edit,button('Remove Fish','text-button remove',()=>actions.remove(fish.id),{'data-key':'remove-'+fish.id}));side.append(manage);
  const note=el('p','personality-note',PERSONALITIES[fish.personality]);side.append(note);
  const history=el('section','history-section');history.append(el('h3','','Little life updates'),el('p','',fish.lastFed?'Last fed '+new Date(fish.lastFed).toLocaleString():'No meals yet. Your first snack could be legendary.'));
  if(!fish.history.length)history.append(el('p','empty-copy','Their snack memoir is a blank page.'));
  for(const event of fish.history){
   const entry=el('div','history-item',event.type==='fed'?'✦ Snack enjoyed · +15 XP':'♡ Food refused');
   if(event.type==='refused')entry.append(el('blockquote','',event.reason));
   const time=el('small','',timeAgo(event.at));time.title=new Date(event.at).toLocaleString();entry.append(time);history.append(entry);
  }
  side.append(history);panel.append(top,main,side);panel.scrollTop=scroll;
 }
 return {render};
}
