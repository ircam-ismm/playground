import { Service, serviceManager } from 'soundworks/server';
import watch from 'node-watch';
import fs from 'fs';
import path from 'path';
import klawSync from 'klaw-sync';

const SERVICE_ID = 'service:directory-watcher';

// supported media formats + json
// https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats
const regexp = /\.(wav|mp3)$/i;

class DirectoryWatcher extends Service {
  constructor(options) {
    super(SERVICE_ID, options);

    const defaults = {
      soundFilePath: 'public/sounds',
    };

    this.list = new Set();

    this.configure(defaults);
  }

  configure(options) {
    super.configure(options);
  }

  start() {
    super.start();

    const soundFilesPath = path.join(process.cwd(), this.options.soundFilePath);

    // init with existing files
    const files = klawSync(soundFilesPath, { nodir: true, recursive: true });
    const uris = files
      .filter(file => regexp.test(file.path))
      .map(file => path.relative(soundFilesPath, file.path));

    uris.forEach(uri => this.list.add(`sounds/${uri}`));

    // listen for updates
    watch(soundFilesPath, { encoding: 'buffer', recursive: true }, (eventType, filename) => {
      filename = filename.toString();
      console.log(eventType, filename);

      if (!regexp.test(filename))
        return;

      const uri = path.relative(soundFilesPath, filename);

      switch (eventType) {
        case 'update':
          this.list.add(`sounds/${uri}`);
          break;
        case 'remove':
          this.list.delete(`sounds/${uri}`);
          break;
      }

      this.emit('update', this.getList());
    });

    this.ready();
  }

  getList() {
    return Array.from(this.list);
  }
}

serviceManager.register(SERVICE_ID, DirectoryWatcher);

export default DirectoryWatcher;
