import { isFunction } from '@ircam/sc-utils';

export default function assignSoundBank(collection, soundbank, presetKey, strategy = 'even') {
  const description = collection.getDescription();

  if (!('clientIndex') in description) {
    throw new Error('Cannot execute assignSoundBank: Invalid collection description, parameter "clientIndex" is not defined');
  }

  if (!('filename') in description) {
    throw new Error('Cannot execute assignSoundBank: Invalid collection description, parameter "filename" is not defined');
  }

  if (!('fileConfig') in description) {
    throw new Error('Cannot execute assignSoundBank: Invalid collection description, parameter "fileConfig" is not defined');
  }

  if (!isFunction(collection.forEach)) {
    collection = [collection];
  }

  if (!soundbank) {
    collection.forEach(state => state.set({
      filename: null,
      fileConfig: null,
    }));

    return;
  }

  const filenames = Object.keys(soundbank.files);
  // ensure
  switch (strategy) {
    case 'even': {
      // apply a random offset so that multiple call will lead to different file assignment
      const offset = Math.floor(Math.random() * filenames.length);

      collection.forEach(state => {
        const clientIndex = state.get('clientIndex');
        const filename = filenames[(offset + clientIndex) % filenames.length];
        const fileConfig = soundbank.files[filename];

        state.set({ filename, fileConfig });
      });

      break;
    }
    case 'random':
    default: {
      if (strategy !== 'random') {
        console.log(`Cannot execute assignSoundBank with undefined strategy ${strategy}: Falling back to "random"`);
      }

      collection.forEach(state => {
        const filename = filenames[Math.floor(Math.random() * filenames.length)];
        const fileConfig = soundbank.files[filename];

        state.set({ filename, fileConfig });
      });

      break;
    }
  }
}
