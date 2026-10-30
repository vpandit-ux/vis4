import { useState, useEffect, useRef } from "react";
import { initialState, fakeDevice, MAX_LAYERS, LOOP_SECS } from "./fakeDevice";
import { playSounds } from "./audio";
import guitarIcon from "./guitarIcon";
import "./App.css";

// One ring per layer: outer = layer 1 (green), then blue, then orange.
const RINGS = [
  { r: 88, stroke: "#30d158" },
  { r: 72, stroke: "url(#blueGradient)" },
  { r: 56, stroke: "url(#orangeGradient)" }
];

export default function App() {
  // All the things that change live in ONE state object (see fakeDevice.js).
  const [state, setState] = useState(initialState);
  const latest = useRef(initialState);       // the newest state, so sounds are played exactly once

  // Ask the fake device what happens next, remember it, show it, and play any sounds it wants.
  const send = (type, arg) => {
    const next = fakeDevice(latest.current, type, arg);
    if (next === latest.current) return;     // nothing changed
    latest.current = next;
    setState(next);
    playSounds(next.sounds);
  };

  // Time passing: 25 times a second the device is told how many seconds went by.
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      send("tick", (now - last) / 1000);
      last = now;
    }, 40);
    return () => clearInterval(id);
  }, []);

  const { mode, playing, loopOn, layers, recIdx, loopSecs, position, chosenPart, status } = state;
  const busy = mode === "recording" || mode === "overdubbing";
  const frac = loopSecs ? Math.max(0, Math.min(1, position / loopSecs)) : 0;

  return (
    <main>
      <div id="screen">
        <section className="panel">
          <div id="ringWrap">
            <svg id="ring" viewBox="0 0 200 200" aria-hidden="true">
              <defs>

          <linearGradient id="greenGradient" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#83eeb1"/>
            <stop offset="42%" stopColor="#44d98a"/>
            <stop offset="100%" stopColor="#24a979"/>
          </linearGradient>
          <linearGradient id="blueGradient" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8bc7ff"/>
            <stop offset="45%" stopColor="#4b9ef5"/>
            <stop offset="100%" stopColor="#4d72d2"/>
          </linearGradient>
          <linearGradient id="orangeGradient" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffe4a4"/>
            <stop offset="45%" stopColor="#ffc16a"/>
            <stop offset="100%" stopColor="#e88a51"/>
          </linearGradient>
              </defs>
              {RINGS.map(({ r }) => (
                <circle key={"track" + r} cx="100" cy="100" r={r} stroke="#2a2a2c" strokeWidth="12" />
              ))}
              {RINGS.map(({ r, stroke }, i) => {
                const layer = layers[i], C = 2 * Math.PI * r;
                return (
                  <circle
                    key={"fill" + r}
                    className={i === recIdx ? "blink" : ""}
                    cx="100" cy="100" r={r} stroke={stroke} strokeWidth="12"
                    strokeDasharray={layer ? "none" : `0 ${C}`}
                    transform="rotate(-90 100 100)"
                    style={{ opacity: layer ? (i === recIdx ? 1 : 0.6) : 0 }}
                  />
                );
              })}
              {/* Playback progress: a bright arc over each recorded ring */}
              {RINGS.map(({ r, stroke }, i) => {
                const layer = layers[i], C = 2 * Math.PI * r;
                return (
                  <circle
                    key={"prog" + r}
                    cx="100" cy="100" r={r} stroke={stroke} strokeWidth="12"
                    strokeDasharray={`${C * frac} ${C}`}
                    transform="rotate(-90 100 100)"
                    pointerEvents="none"
                    style={{ opacity: layer && i !== recIdx && frac > 0 ? 1 : 0 }}
                  />
                );
              })}
              <line
                x1="100" y1="4" x2="100" y2="52" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"
                transform={`rotate(${frac * 360} 100 100)`}
                style={{ opacity: mode === "idle" || busy ? 0 : 1 }}
              />
            </svg>

            <button
              id="play"
              onClick={() => send("play")}
              disabled={mode === "idle" || busy}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing && !busy ? (
                <svg viewBox="0 0 48 48"><rect x="9" y="6" width="11" height="36" rx="2" /><rect x="28" y="6" width="11" height="36" rx="2" /></svg>
              ) : (
                <svg viewBox="0 0 48 48"><polygon points="12,6 42,24 12,42" /></svg>
              )}
            </button>
          </div>

          <button
            id="rec"
            onClick={() => send("record")}
            disabled={!busy && layers.length >= MAX_LAYERS}
            aria-label={busy ? "Stop recording" : "Record selected part"}
          >
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="21" stroke="#fff" strokeWidth="4" />
              {busy
                ? <rect x="15" y="15" width="18" height="18" rx="4" fill="#e54d3f" />
                : <circle cx="24" cy="24" r="16" fill="#ffffff" />}
            </svg>
          </button>

          <button
            id="loop"
            className={loopOn ? "on" : ""}
            onClick={() => send("loop")}
            disabled={mode === "idle" || busy}
            aria-pressed={loopOn}
            aria-label="Loop"
          >
            <svg viewBox="0 0 48 48">
              <path d="M38 24A14 14 0 1 1 29 11" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              <polygon points="22,2 38,11 24,19" />
            </svg>
          </button>

          <button
            id="delete"
            onClick={() => send("delete")}
            disabled={layers.length === 0}
            aria-label="Delete last layer"
            title="Delete last layer"
          >
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="21" strokeWidth="4" />
              <path d="M16 16L32 32M32 16L16 32" strokeWidth="5" />
            </svg>
          </button>
        </section>
      </div>

      <section id="library" aria-label="Premade tune library">
        <div className="part-grid" role="group" aria-label="Select instrument to record">
          <button className={"part" + (chosenPart === "guitar" ? " selected" : "")} data-part="guitar"
            aria-pressed={chosenPart === "guitar"} aria-label="Guitar" title="Guitar" onClick={() => send("selectPart", "guitar")}>
            <img className="guitar-reference-icon" src={guitarIcon} alt="" aria-hidden="true" />
            <span className="part-label">Guitar</span>
          </button>

          <button className={"part" + (chosenPart === "drums" ? " selected" : "")} data-part="drums"
            aria-pressed={chosenPart === "drums"} aria-label="Drums" title="Drums" onClick={() => send("selectPart", "drums")}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <ellipse cx="22.5" cy="16.5" rx="13" ry="5.5" />
              <path d="M9.5 16.5V33.5C9.5 37.6 15.3 40.5 22.5 40.5C29.7 40.5 35.5 37.6 35.5 33.5V16.5" />
              <path d="M15 21V38.2" />
              <path d="M23 21V40" />
              <path d="M31 21V38.2" />
              <path d="M25 15L35.8 6.2" />
              <path d="M28.2 20.6L41 17.8" />
            </svg>
            <span className="part-label">Drums</span>
          </button>

          <button className={"part" + (chosenPart === "bass" ? " selected" : "")} data-part="bass"
            aria-pressed={chosenPart === "bass"} aria-label="Keyboard" title="Keyboard" onClick={() => send("selectPart", "bass")}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <rect x="7" y="7" width="34" height="34" rx="3.2" />
              <path d="M13 7V41" />
              <path d="M21 7V26" />
              <path d="M27 7V26" />
              <path d="M35 7V41" />
            </svg>
            <span className="part-label">Keyboard</span>
          </button>
        </div>
        <span id="libraryStatus" className="sr-only" role="status" aria-live="polite">{status}</span>
      </section>
    </main>
  );
}
