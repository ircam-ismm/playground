const path = require('path');
const fs = require('fs');

let reset = false;

if (process.argv.length === 3 && process.argv[2] === '--reset') {
  reset = true;
}

// pick a dir in default
const dir1 = path.join(process.cwd(), 'projects', 'dev', 'sounds', 'crickets');
const dir2 = path.join(process.cwd(), 'projects', 'dev', 'sounds', '1. crickets');

let from;
let to;

if (!reset) {
  from = dir1;
  to = dir2;
} else {
  from = dir2;
  to = dir1;
}

try {
  const prevSoundbankFile = path.join(from, '_soundbank.json');
  const prevSoundbank = JSON.parse(fs.readFileSync(prevSoundbankFile));

  console.log(prevSoundbank.name, prevSoundbank.path, prevSoundbank.files['Crickets.mp3'].presets.granularSynth.volume);

  fs.renameSync(from, to);

  // let some time for the server to do its job
  setTimeout(() => {
    const soundbankFile = path.join(to, '_soundbank.json');
    const soundbank = JSON.parse(fs.readFileSync(soundbankFile));

    console.log(soundbank.name, soundbank.path, soundbank.files['Crickets.mp3']);
  }, 2000);
} catch(err) {
  console.log(err);
}

