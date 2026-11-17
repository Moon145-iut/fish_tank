import {el,button,avatar,$,timeAgo,eventText} from './dom.js';
import {HUNGRY_THRESHOLD,MAX_FISH} from '../game/defaults.js';
import {fishStatus} from '../game/rules.js';

export function createDashboard(store,actions){
 const attention=$('#attentionList'),list=$('#fishList'),activity=$('#activityList');
 function render(){
  const {fish,preferences}=store.state;
  const hungry=fish.filter(f=>f.hunger>=HUNGRY_THRESHOLD).sort((a,b)=>b.hunger-a.hunger);
  $('#headerCount').textContent=fish.length+' fish';$('#rosterCount').textContent=fish.length;
  $('#attentionCount').textContent=hungry.length;$('#attentionCount').setAttribute('aria-label',hungry.length+' hungry fish');
  $('#fishStat').textContent=String(fish.length).padStart(2,'0');$('#fedStat').textContent=String(fish.reduce((sum,f)=>sum+f.totalFeeds,0)).padStart(2,'0');
  $('#saveStatus').textContent=store.storageOK?'Saved in this browser. Just yours.':'Storage unavailable. Changes last this visit only.';
  $('#emptyTank').hidden=fish.length>0;
  $('#tankHint').textContent=hungry.length?('Click a fish or pick someone in the sidebar. '+hungry[0].name+' looks hungry.'):'Click a fish to say hello. Drag gently to look around.';
  for(const id of ['#dayToggle','#tankNight']){const node=$(id);node.setAttribute('aria-pressed',preferences.night);node.replaceChildren(document.createTextNode(preferences.night?'☀ ':'☾ '),el('span','',preferences.night?'Day mode':'Night mode'));}
  $('#atmosphereLabel').textContent=preferences.night?'MOONLIT & MELLOW':'SUNLIT & SLIGHTLY CHAOTIC';
  for(const id of ['#addFishTop','#addFishBottom']){$(id).disabled=fish.length>=MAX_FISH;$(id).title=fish.length>=MAX_FISH?'Twelve friends is a full house!':'Create a friend fish';}
  const expanded=new Set([...attention.children].filter(n=>n.hasAttribute('open')).map(n=>n.dataset.id));
  attention.replaceChildren();
  if(!hungry.length)attention.append(el('p','empty-copy','Everyone’s fed. Suspiciously peaceful.'));
  for(const f of hungry){
   const card=el('article','attention-card');card.dataset.id=f.id;if(expanded.has(f.id))card.setAttribute('open','');
   const summary=button('','attention-summary',()=>{card.toggleAttribute('open');summary.setAttribute('aria-expanded',card.hasAttribute('open'));},{'aria-label':f.name+' is hungry. Show feeding actions.','aria-expanded':card.hasAttribute('open'),'data-key':'attention-'+f.id});
   const copy=el('span','attention-copy');copy.append(el('strong','',f.name+' demands snacks'),el('p','',Math.round(f.hunger)+'/100 hunger · Tiny belly. Big feelings.'));
   summary.append(avatar(f),copy,el('span','attention-chevron','⌄'));
   const row=el('div','attention-actions');
   const feed=button(store.isFeeding(f.id)?'Snack incoming…':'✦ Feed','button primary',()=>actions.feed(f.id),{'data-key':'alert-feed-'+f.id});
   const refuse=button('Don’t Feed','button quiet',()=>actions.refuse(f.id),{'data-key':'alert-refuse-'+f.id});
   feed.disabled=store.isFeeding(f.id)||!actions.canAnimate();refuse.disabled=store.isFeeding(f.id);
   row.append(feed,refuse);card.append(summary,row);attention.append(card);
  }
  list.replaceChildren();
  if(!fish.length)list.append(el('p','empty-copy','No friends in the water yet. Add someone to start the school.'));
  for(const f of fish){
   const row=button('','fish-row'+(store.selectedId===f.id?' selected':''),()=>actions.select(f.id),{'aria-label':'Select '+f.name,'aria-pressed':store.selectedId===f.id,'data-key':'select-'+f.id});
   row.dataset.fishId=f.id;
   const copy=el('span','fish-row-copy'),top=el('span','fish-row-top'),sub=el('span','fish-row-sub'),track=el('span','mini-meter'),fill=el('span',f.hunger>=65?'hungry':'');
   top.append(el('span','fish-row-name',f.name),el('span','fish-row-status'+(f.hunger>=65?' hungry':''),fishStatus(f,store.runtime(f.id))));
   sub.append(el('span','',f.personality),el('span','',Math.round(f.hunger)+'/100 hunger'));fill.style.width=f.hunger+'%';track.append(fill);copy.append(top,sub,track);row.append(avatar(f),copy);list.append(row);
  }
  activity.replaceChildren();
  if(!store.state.activity.length)activity.append(el('p','empty-copy','No splashes yet. A snack is a good place to start.'));
  for(const event of store.state.activity.slice(0,6)){
   const item=el('div','activity-item'),copy=el('div','activity-copy',eventText(event));copy.append(el('small','',timeAgo(event.at)));item.append(el('span','activity-dot '+event.type),copy);activity.append(item);
  }
 }
 return {render};
}
