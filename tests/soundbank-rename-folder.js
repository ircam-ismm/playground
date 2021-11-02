const path = require('path');
const fs = require('fs');

let reset = false;

if (process.argv.length === 3 && process.argv[2] === '--reset') {
  reset = true;
}

// pick a dir in default
const dir1 = path.join(process.cwd(), 'projects', 'default', 'sounds', 'crickets');
const dir2 = path.join(process.cwd(), 'projects', 'default', 'sounds', '1. crickets');

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
  fs.renameSync(from, to);

  // let some time for the server to do its job
  setTimeout(() => {
    const soundbankFile = path.join(to, '_soundbank.json');
    const soundbank = JSON.parse(fs.readFileSync(soundbankFile));
    console.log(soundbank);
  }, 2000);
} catch(err) {
  console.log(err);
}

