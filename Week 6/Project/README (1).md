# Looper Amp: React interface (Week 6)

Run it:

    npm install
    npm run dev

Then open the address it prints (usually http://localhost:5173). Click Record once to allow sound.

- `src/fakeDevice.js`: everything the hardware would do (record, play, loop, delete, choose a part, time passing). It takes the old state and returns the new one. Replaced by Arduino messages in Week 7.
- `src/App.jsx`: the screen. `useState` holds the state; buttons call `send(...)`, which asks the fake device; the rings, icons and buttons are drawn from the state.
- `src/audio.js`: the synthesized guitar, drums and keyboard parts (no audio files).
- `src/guitarIcon.js`: the guitar icon image.
- `src/App.css`: the look (same as the HTML version).
