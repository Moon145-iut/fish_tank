import {el,button,avatar,$} from './dom.js';
import {SPECIES,PERSONALITIES,COLORS,MAX_FISH} from '../game/defaults.js';
import {validReason} from '../game/rules.js';

export function createModals(store,actions,toast){
 const dialog=$('#modal'),content=$('#modalContent');let trigger=null,submitting=false;
 function close(){if(dialog.open)dialog.close();}
 dialog.addEventListener('close',()=>{submitting=false;if(trigger?.isConnected)trigger.focus();else $('#addFishTop').focus();});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 // Native dialog makes the background inert; this also handles Tab wrapping explicitly.
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('button:not(:disabled), input, textarea, select, [tabindex="0"]')].filter(n=>n.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 function open(title,description,eyebrow='A LITTLE FISH BUSINESS'){
  if(!dialog.open)trigger=document.activeElement;submitting=false;content.replaceChildren();
  const inner=el('div','modal-inner'),head=el('div','modal-head');head.append(el('span','eyebrow',eyebrow),button('×','icon-button panel-close',close,{'aria-label':'Close dialog'}));
  const heading=el('h2','',title);heading.id='modalTitle';inner.append(head,heading,el('p','modal-description',description));content.append(inner);if(!dialog.open)dialog.showModal();dialog.scrollTop=0;return inner;
 }
 function actionsRow(submit,label='Save'){
  const row=el('div','modal-actions'),save=button(label,'button primary',submit);row.append(button('Cancel','button quiet',close),save);return {row,save};
 }
 function confirm(title,description,label,run){
  const inner=open(title,description,'LET’S MAKE SURE');const {row,save}=actionsRow(()=>{if(submitting)return;submitting=true;save.disabled=true;run();close();},label);save.className='button danger';inner.append(row);row.firstChild.focus();
 }
 function fishEditor(id=null){
  const fish=id?store.find(id):null;if(id&&!fish)return;
  if(!id&&store.state.fish.length>=MAX_FISH){toast('Twelve friends is a full house!');return;}
  const draft={name:fish?.name||'',species:fish?.species||'puffer',color:fish?.color||COLORS[0],accent:fish?.accent||'#ffe0a3',personality:fish?.personality||'Sweet',tagline:fish?.tagline||''};
  const inner=open(id?'A little fish makeover.':'Make a friend-fish.',id?'Same friend. Fresh fins. Their memories and growth stay with them.':'A real-life friend. A tiny aquatic alter ego. You’re in charge of the snacks.','WELCOME TO THE WATER');
  const form=el('form');form.noValidate=true;inner.append(form);
  function label(text,id){const l=el('label','field-label',text);l.htmlFor=id;return l;}
  const name=el('input');name.id='friendName';name.name='name';name.maxLength=24;name.required=true;name.placeholder='e.g. Nico';name.value=draft.name;name.autocomplete='off';
  form.append(label('Friend’s name','friendName'),name,el('div','field-label','Choose their fish form'));
  const speciesOptions=el('div','species-options');speciesOptions.setAttribute('role','radiogroup');speciesOptions.setAttribute('aria-label','Species');
  for(const [value,title]of Object.entries(SPECIES)){
   const option=el('label','species-option'),radio=el('input');radio.type='radio';radio.name='species';radio.value=value;radio.checked=draft.species===value;radio.setAttribute('aria-label',title);option.append(radio,avatar({...draft,species:value}),el('span','',title));
   radio.addEventListener('change',()=>{draft.species=value;preview();});speciesOptions.append(option);
  }form.append(speciesOptions);
  const colorFields=el('div','color-fields'),primary=el('div'),secondary=el('div'),swatches=el('div','swatches');primary.append(el('div','field-label','Primary color'),swatches);
  COLORS.forEach((color,index)=>{const swatch=button('','swatch',()=>{draft.color=color;for(const b of swatches.children)b.setAttribute('aria-pressed',b===swatch);preview();},{'aria-label':['Apricot','Rose pink','Lilac','Sky blue','Mint','Butter yellow','Coral','Sage'][index],'aria-pressed':draft.color===color});swatch.style.setProperty('--swatch',color);swatches.append(swatch);});
  const accent=el('input');accent.type='color';accent.id='accentColor';accent.value=draft.accent;accent.addEventListener('input',()=>{draft.accent=accent.value;preview();});secondary.append(label('Accent color','accentColor'),accent);colorFields.append(primary,secondary);form.append(colorFields);
  const personality=el('select');personality.id='personality';for(const key of Object.keys(PERSONALITIES)){const option=el('option','',key);option.value=key;personality.append(option);}personality.value=draft.personality;
  const help=el('p','personality-help',PERSONALITIES[draft.personality]);personality.addEventListener('change',()=>{draft.personality=personality.value;help.textContent=PERSONALITIES[draft.personality];preview();});form.append(label('Personality','personality'),personality,help);
  const tagline=el('input');tagline.id='tagline';tagline.maxLength=50;tagline.placeholder='e.g. Always late, even underwater';tagline.value=draft.tagline;form.append(label('A little tagline (optional)','tagline'),tagline);
  const previewNode=el('div','fish-preview');previewNode.setAttribute('aria-label','Fish appearance preview');const error=el('p','field-error');error.id='editorError';error.setAttribute('aria-live','polite');name.setAttribute('aria-describedby','editorError');
  function preview(){previewNode.replaceChildren(avatar(draft));const caption=el('div','preview-caption');caption.append(el('strong','',name.value.trim()||'Your new little friend'),el('span','',draft.personality+' '+SPECIES[draft.species]));previewNode.append(caption);for(const a of speciesOptions.querySelectorAll('.fish-avatar')){a.style.setProperty('--fish-color',draft.color);a.style.setProperty('--accent-color',draft.accent);}}
  let touched=false;
  function validate(){const ok=name.value.trim().length>=2&&name.value.trim().length<=24;if(touched){error.textContent=ok?'':'A good fish name needs 2–24 characters.';name.setAttribute('aria-invalid',!ok);}return ok;}
  const {row,save}=actionsRow(null,id?'Save changes':'Release into the tank');save.type='submit';save.disabled=!validate();
  name.addEventListener('input',()=>{touched=true;save.disabled=!validate();preview();});name.addEventListener('blur',()=>{touched=true;validate();});
  form.addEventListener('submit',event=>{event.preventDefault();touched=true;if(submitting||!validate())return;submitting=true;save.disabled=true;
   try{const saved=store.saveFish({...draft,name:name.value,tagline:tagline.value},id);close();actions.select(saved.id);toast(id?saved.name+' is looking fresh.':saved.name+' is officially a fish now!');}
   catch(e){error.textContent=e.message;submitting=false;save.disabled=false;}
  });
  form.append(previewNode,error,row);preview();name.focus();
 }
 function refuse(id){
  const fish=store.find(id);if(!fish||fish.hunger<65||store.isFeeding(id))return;
  const inner=open('Why aren’t you feeding '+fish.name+'?',PERSONALITIES[fish.personality],'A DIFFICULT DECISION');
  const form=el('form'),label=el('label','field-label','Please explain yourself'),reason=el('textarea');label.htmlFor='refusalReason';reason.id='refusalReason';reason.maxLength=160;reason.rows=4;reason.placeholder='He ate my fries last week…';reason.required=true;
  const counterRow=el('div','counter-row'),error=el('p','field-error'),counter=el('span','char-counter','0 / 160');error.id='refusalError';error.textContent='Give them at least 3 non-whitespace characters.';error.setAttribute('aria-live','polite');reason.setAttribute('aria-describedby','refusalError');counterRow.append(error,counter);
  const {row,save}=actionsRow(null,'Submit Excuse');save.type='submit';save.disabled=true;
  reason.addEventListener('input',()=>{save.disabled=!validReason(reason.value);counter.textContent=reason.value.length+' / 160';error.textContent=validReason(reason.value)?'': 'Please use 3–160 characters, with a little actual explanation.';});
  form.addEventListener('submit',event=>{event.preventDefault();if(submitting||!validReason(reason.value))return;submitting=true;save.disabled=true;
   if(actions.submitRefusal(id,reason.value)){close();toast('You refused to feed '+fish.name+'. The drama is real.');}
   else{error.textContent='This fish is no longer available for an excuse. Close and try again.';submitting=false;}
  });
  form.append(label,reason,counterRow,row,el('p','modal-footnote','No fish were harmed in the making of this excuse.'));inner.append(form);reason.focus();
 }
 function settings(){
  const inner=open('A little tank housekeeping.','Everything stays in this browser. There are no accounts, uploads, or remote saves.','YOUR TANK, YOUR RULES');
  const card=el('div','settings-card');card.append(el('h3','','A fresh start'),el('p','','Reset the roster, history, growth, and day/night preference to the three demo friends. This only affects this app’s save.'));
  card.append(button('Reset Demo Aquarium','button danger',()=>confirm('Reset the friend zone?','Your current fish and their history will be replaced by Rafi, Sami, and Nila. This cannot be undone.','Reset aquarium',()=>{actions.reset();toast('Fresh water. Familiar faces. Welcome back!');})));inner.append(card,button('All done','button quiet',close));
 }
 return {fishEditor,refuse,settings,close,confirm,remove(id){const f=store.find(id);if(f)confirm('Say goodbye to '+f.name+'?','This removes their fish and personal history from the aquarium. Any snack in progress is canceled.','Remove Fish',()=>{store.remove(id);toast(f.name+' left the aquarium. Their legend lives on.');});}};
}
