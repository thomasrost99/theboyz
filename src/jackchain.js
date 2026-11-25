// Jack's beer confirmation chain: before his + adds a beer he must confirm this many popups in a row.
// Change this one number to make it longer or shorter (the step list below cycles if it is shorter than the count).
export const CONFIRM_STEPS = 20;

// Each step: e = emoji, t = headline, m = message, ok = confirm label, no = cancel label.
// Layout and position are chosen per step in Beer.jsx so the confirm button never sits in the same spot twice in a row.
export const STEPS = [
  { e: "🤔", t: "Hold on.", m: "Are you sure you want another beer?", ok: "Yes", no: "Fine, I'm a coward" },
  { e: "🧐", t: "Really?", m: "Your liver just filed a formal complaint with HR.", ok: "I read it, proceed", no: "Fine, I'm a coward" },
  { e: "📞", t: "Incoming call", m: "It's your future self. He says no, and he sounds tired.", ok: "Decline the call", no: "Listen to him" },
  { e: "🦆", t: "A duck has questions", m: "The duck wants to know if this is really the best use of your hands.", ok: "Tell the duck yes", no: "Apologize to the duck" },
  { e: "🧾", t: "Receipt check", m: "Your decision making has the structural integrity of a wet paper straw. Still sure?", ok: "Structurally sound", no: "Fine, I'm a coward" },
  { e: "🕯️", t: "A moment of silence", m: "For the version of you who had a plan tonight.", ok: "Moment over, go on", no: "Honor the plan" },
  { e: "👀", t: "The others are watching", m: "Tommy and Hayden can see this counter. Hayden is already smirking.", ok: "Let him smirk", no: "Fine, I'm a coward" },
  { e: "🧠", t: "Brain says", m: "Brain has left the chat. Only the beer part of you remains.", ok: "Beer part confirms", no: "Bring brain back" },
  { e: "🐢", t: "Mean but fair", m: "A tortoise in a tiny hat has better impulse control than you.", ok: "Tortoise is a liar", no: "Fine, I'm a coward" },
  { e: "🚨", t: "Beer alert, level 4", m: "Somewhere a sommelier just felt a disturbance in the force.", ok: "Disturb away", no: "Calm the force" },
  { e: "📜", t: "Legal notice", m: "By tapping confirm you accept that you are, in fact, the group's designated beer guy.", ok: "I accept the title", no: "Fine, I'm a coward" },
  { e: "🪞", t: "Look in the mirror", m: "Not literally, you'd just get distracted by your own hair. Anyway: sure?", ok: "Hair is fine", no: "Look away" },
  { e: "🐔", t: "Halfway, you raccoon in a bumper car", m: "Ten down. A chicken would have quit by now. Is that who you want to lose to?", ok: "Beat the chicken", no: "Chicken wins" },
  { e: "💤", t: "Be honest", m: "You have the energy of a damp sock in a library and you want more beer. Sure?", ok: "Damp sock, confirmed", no: "Fine, I'm a coward" },
  { e: "🛸", t: "Aliens on line one", m: "They studied humans for years and say this one is the most embarrassing.", ok: "Hang up on aliens", no: "Take it as a sign" },
  { e: "🎻", t: "Dramatic violin", m: "Every tap you make, a violinist somewhere weeps. His name is Gerald.", ok: "Sorry Gerald, go on", no: "Spare Gerald" },
  { e: "🏆", t: "Almost there", m: "Only a few more. You are the last grape in the bag: wrinkled but persistent.", ok: "Persist", no: "Fine, I'm a coward" },
  { e: "⚖️", t: "Final warning, probably", m: "The beer is neutral. The beer is just a beer. YOU are the one doing this.", ok: "It is I", no: "Blame the beer, quit" },
  { e: "🔔", t: "Penultimate popup", m: "Next one is the last. Your thumb has shown more commitment than your whole personality.", ok: "Thumb for president", no: "Fine, I'm a coward" },
  { e: "🍺", t: "ONE. LAST. TIME.", m: "This is it. Confirm and the beer is yours. Hayden will be informed. Nobody will be proud.", ok: "ADD THE BEER", no: "Fine, I'm a coward" },
];
