// fakeDevice.js: EVERYTHING the hardware would do lives in this one file.
// It takes the current state and something that happened ("record", "play", "loop", "delete",
// "selectPart", or "tick" for time passing) and returns the NEW state. It never edits the old one.
// The sounds it wants played come back in `state.sounds`; App.jsx plays them.
// Next week this is the one piece you replace with real messages from the Arduino.

export const MAX_LAYERS = 3;
export const LOOP_SECS = 4;            // every preset part is exactly 4 seconds
const STEP = 0.25;                     // a quarter of a second per step (16 steps per loop)

export const initialState = {
  mode: "idle",            // idle | recording | loop | overdubbing
  playing: false,          // is the dot going round?
  loopOn: true,            // repeat at the end, or stop?
  layers: [],              // each: { part, style, fill: 0-1 }
  recIdx: null,            // index of the layer being recorded right now
  loopSecs: 0,             // loop length (set by the first recording)
  position: 0,             // seconds into the loop
  layerTime: 0,            // seconds spent recording the current layer
  chosenPart: "guitar",    // guitar | drums | bass (shown as Keyboard)
  chosenStyle: "indie",
  status: "Guitar selected. Press Record above to add it.",   // read out by screen readers
  sounds: []               // sounds to play this time: { part, style, step }
};

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function beginRecording(s) {
  if (s.layers.length >= MAX_LAYERS) return;
  s.layers.push({ part: s.chosenPart, style: s.chosenStyle, fill: 0 });
  s.recIdx = s.layers.length - 1;
  s.layerTime = 0;
  if (s.mode === "idle") { s.mode = "recording"; s.position = 0; s.loopSecs = LOOP_SECS; }
  else s.mode = "overdubbing";
  s.playing = true;
  s.sounds.push({ part: s.chosenPart, style: s.chosenStyle, step: 0 });
  s.status = "Recording " + s.chosenPart + "... wait four seconds or press Record to finish.";
}

function finishRecording(s) {
  if (s.recIdx === null) return;
  s.layers[s.recIdx].fill = 1;
  s.recIdx = null; s.layerTime = 0;
  s.mode = "loop"; s.playing = false; s.position = 0;
  s.status = s.layers.length + " layer" + (s.layers.length === 1 ? "" : "s") +
    " saved. Press Play to hear your track, or select another instrument and Record.";
}

// Queue the sounds for every step the dot passes between two positions.
function soundsBetween(s, oldPos, newPos) {
  const first = Math.floor(oldPos / STEP) + 1, last = Math.floor(newPos / STEP);
  for (let step = first; step <= last; step++)
    for (const l of s.layers) s.sounds.push({ part: l.part, style: l.style, step: step % 16 });
}

export function fakeDevice(state, type, arg) {
  if (type === "tick" && !state.playing) return state;          // nothing to do: no re-render
  const s = { ...state, layers: state.layers.map(l => ({ ...l })), sounds: [] };   // a copy, so React sees a change

  if (type === "record") {
    if (s.mode === "recording" || s.mode === "overdubbing") finishRecording(s);
    else beginRecording(s);
  }

  if (type === "delete" && s.layers.length) {
    s.layers.pop(); s.recIdx = null; s.layerTime = 0;
    if (!s.layers.length) { s.mode = "idle"; s.playing = false; s.position = 0; s.loopSecs = 0; }
    else { s.mode = "loop"; s.playing = false; s.position = 0; }
    s.status = s.layers.length ? "Last layer removed. " + s.layers.length + " remain." : "All layers cleared. Select a part and press Record.";
  }

  if (type === "loop") s.loopOn = !s.loopOn;

  if (type === "play" && s.mode === "loop") {
    s.playing = !s.playing;
    if (s.playing && s.position >= LOOP_SECS) s.position = 0;
    if (s.playing && s.position === 0) s.layers.forEach(l => s.sounds.push({ part: l.part, style: l.style, step: 0 }));
  }

  if (type === "selectPart") {
    s.chosenPart = arg;
    s.status = cap(arg) + " selected. Press Record above to add it.";
  }

  if (type === "tick") {                                          // time passing: arg = seconds since the last tick
    let remaining = Math.min(0.12, arg);
    while (remaining > 0 && s.playing) {
      const segment = Math.min(remaining, LOOP_SECS - s.position);
      const old = s.position, to = s.position + segment;
      soundsBetween(s, old, to);                                  // the layer being recorded plays too
      s.position = to;
      if (s.recIdx !== null) { s.layerTime += segment; s.layers[s.recIdx].fill = Math.min(1, s.layerTime / LOOP_SECS); }
      remaining -= segment;
      if (s.recIdx !== null && s.layerTime >= LOOP_SECS - 0.001) { finishRecording(s); break; }
      if (s.position >= LOOP_SECS - 0.00001) {
        if (s.loopOn) s.position = 0;                             // loop on: go round again
        else { s.playing = false; s.position = 0; break; }        // loop off: stop at the end
      }
      if (segment <= 0) break;
    }
  }

  return s;
}
