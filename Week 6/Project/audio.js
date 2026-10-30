// audio.js: the synthesized instruments (no audio files). Copied from the HTML version.
// The three preset parts are each exactly 4 seconds (16 steps of a quarter second).
let audio = null;
const banks={
 indie:{chords:[[60,64,67],[57,60,64],[53,57,60],[55,59,62]], bass:[36,33,29,31], lead:[72,76,74,69,72,76,79,74]},
 rock:{chords:[[52,59,64],[48,55,60],[55,62,67],[50,57,62]], bass:[40,36,43,38], lead:[76,74,72,79,76,74,71,74]},
 chill:{chords:[[60,64,67,71],[55,59,62,67],[57,60,64,69],[53,57,60,64]], bass:[36,31,33,29], lead:[72,71,67,69,72,76,74,67]}
};
function ensureAudio(){
  if(!audio) audio=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended') audio.resume();
  return audio;
}
// Lightweight offline instrument synthesis.  Guitar uses a plucked-string model;
// keyboard uses decaying piano-like partials; drums use separate noise/tone envelopes.
function midiHz(m){return 440*Math.pow(2,(m-69)/12);}
function pluck(midi,when,length=.9,volume=.12){
  const ctx=ensureAudio(), sr=ctx.sampleRate, hz=midiHz(midi), delay=Math.max(2,Math.round(sr/hz));
  const duration=Math.min(2.2,length+.5), count=Math.ceil(sr*duration);
  const buffer=ctx.createBuffer(1,count,sr), samples=buffer.getChannelData(0);
  const comb=new Float32Array(delay);
  for(let i=0;i<delay;i++) comb[i]=(Math.random()*2-1)*.72;
  let idx=0,previous=0;
  for(let i=0;i<count;i++){
    const current=comb[idx];
    comb[idx]=.996*(current+previous)*.5;
    previous=current;
    idx=(idx+1)%delay;
    const attack=Math.min(1,i/(sr*.005));
    const release=Math.min(1,Math.max(0,(count-i)/(sr*.12)));
    samples[i]=current*attack*release;
  }
  const source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=3500;
  gain.gain.value=volume;
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
  source.start(when);
}
function piano(midi,when,length=.55,volume=.09){
  const ctx=ensureAudio(), base=midiHz(midi), master=ctx.createGain();
  master.gain.value=volume;master.connect(ctx.destination);
  [1,2,3,4].forEach((partial,i)=>{
    const osc=ctx.createOscillator(),amp=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(base*partial*(1+i*.0004),when);
    const peak=[.8,.23,.10,.045][i];
    amp.gain.setValueAtTime(.0001,when);
    amp.gain.exponentialRampToValueAtTime(peak,when+.008+i*.002);
    amp.gain.exponentialRampToValueAtTime(.0001,when+Math.max(.18,length*(i===0?1.8:1.05-i*.12)));
    osc.connect(amp);amp.connect(master);osc.start(when);osc.stop(when+Math.max(.3,length*1.9)+.03);
  });
}
function noiseHit(when,kind,volume){
  const ctx=ensureAudio(),n=Math.ceil(ctx.sampleRate*(kind==='hat'?.085:.22));
  const buffer=ctx.createBuffer(1,n,ctx.sampleRate),v=buffer.getChannelData(0);
  for(let i=0;i<n;i++)v[i]=Math.random()*2-1;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=buffer;filter.type=kind==='hat'?'highpass':'bandpass';
  filter.frequency.value=kind==='hat'?7600:1750;
  gain.gain.setValueAtTime(volume,when);
  gain.gain.exponentialRampToValueAtTime(.0001,when+n/ctx.sampleRate);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(when);
}
function percussion(kind,when,vol=.1){
 const ctx=ensureAudio();
 if(kind==='kick'){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';
  osc.frequency.setValueAtTime(155,when);osc.frequency.exponentialRampToValueAtTime(48,when+.14);
  gain.gain.setValueAtTime(Math.min(.5,vol*1.8),when);gain.gain.exponentialRampToValueAtTime(.0001,when+.23);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(when);osc.stop(when+.24);
 } else if(kind==='snare'){
  noiseHit(when,'snare',vol);
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.value=175;
  gain.gain.setValueAtTime(vol*.5,when);gain.gain.exponentialRampToValueAtTime(.0001,when+.12);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(when);osc.stop(when+.14);
 } else noiseHit(when,'hat',vol*.65);
}
// Each preset is a four-second, 16-step phrase. Keyboard is a dedicated piano-like part,
// not the old bass oscillator hidden behind a keyboard label.
export function soundStep(part,style,step,when){
  const bank=banks[style];
  if(part==='guitar'){
    if(step%4===0){
      const chord=bank.chords[Math.floor(step/4)];
      chord.forEach((m,i)=>pluck(m-12,when+i*.026,.85,.095));
    }
    if(step%4===2)pluck(bank.lead[step%8]-12,when,.38,.06);
  } else if(part==='bass'){
    if(step%4===0){
      const chord=bank.chords[Math.floor(step/4)];
      chord.forEach((m,i)=>piano(m,when+i*.018,.75,.065));
    }
    if(step%2===1)piano(bank.lead[step%8],when,.3,.04);
  } else if(part==='drums'){
    if(step%4===0)percussion('kick',when,.16);
    if(step%8===4)percussion('snare',when,.16);
    if(step%2===0)percussion('hat',when,.12);
    if(style==='rock'&&step%8===6)percussion('kick',when,.10);
  }
}

// Plays a list of {part, style, step} sounds that fakeDevice asked for.
export function playSounds(sounds) {
  if (!sounds.length) return;
  const when = ensureAudio().currentTime + 0.01;
  for (const s of sounds) soundStep(s.part, s.style, s.step, when);
}
