const lines={
hungry:['My stomach has a dramatic monologue.','Any snacks in that big world of yours?','I can hear the food cupboard.','Just browsing the snack menu.','A tiny snack would fix everything.'],
fed:['THANK YOU!!','I owe you my fins.','A five-star dining experience.','You get me. You really get me.','Best. Human. Ever.'],
refused:['WOW. Okay.','I’m telling the other fish.','Noted. Forever.','Unbelievable behavior.','I shall stare out this window, sadly.'],
clicked:['Oh! My favorite giant.','Yes, I’m this cute in person.','You called? I was doing fish stuff.','Welcome to my water.','Is this a social visit or a snack visit?'],
idle:['Your fish are up to something.','Just a little blub for the road.','The rent is surprisingly reasonable.','Nice rock. Very rock-shaped.','We held a meeting. More snacks.']
};
const variants={
Dramatic:{hungry:['I am fading. Theatrically.','Send snacks. It’s a fish emergency.'],fed:['Finally. I was about to eat the decorations.','My faith in humanity is RESTORED.'],refused:['Tell my story. With dramatic lighting.','I’ll remember this at the next fish meeting.'],clicked:['At last! My audience.','Please admire my emotional range.'],idle:['Rehearsing my next hunger monologue.']},
Greedy:{hungry:['I could eat three of those rocks.','I heard a snack-related noise.'],fed:['Lovely appetizer. What’s next?','Is there a second breakfast?'],refused:['I have contacted the snack department.','My lawyer is a goldfish.'],clicked:['You look like someone holding food.'],idle:['Thinking about my next meal.']},
Sleepy:{hungry:['A snack, then another little nap.'],fed:['Worth waking up for.','Dream snack. Real snack. Nice.'],refused:['Too sleepy to be dramatic.','Fine. Back to my nap.'],clicked:['Five more minutes… oh, it’s you.'],idle:['Zzz… blub… zzz.','Resting my very busy fins.']},
Chaotic:{hungry:['SNACK? SNACK? Is that a bubble?'],fed:['Fuel acquired. Zoom mode activated.','BRB. Doing victory laps.'],refused:['I’m rearranging the gravel about this.','That bubble would have fed me.'],clicked:['Catch me if you— oh, you did.'],idle:['That bubble knows something.','I have no idea where I’m going!']},
Sweet:{hungry:['Whenever you have a moment, friend.'],fed:['A little snack, a lot of love.','You make my whole tank brighter.'],refused:['Okay. Still happy you’re here.','I’ll save you a nice bubble anyway.'],clicked:['There you are! I missed you.'],idle:['Sending you one tiny fish hug.']}
};
const previous=new Map();
export function dialogue(fish,kind){const pool=[...(variants[fish.personality]?.[kind]||[]),...lines[kind]];const key=fish.id+kind,last=previous.get(key)??-1;let index=Math.floor(Math.random()*pool.length);if(index===last)index=(index+1)%pool.length;previous.set(key,index);return pool[index];}
export function forgetDialogue(id){for(const key of previous.keys())if(key.startsWith(id))previous.delete(key);}
