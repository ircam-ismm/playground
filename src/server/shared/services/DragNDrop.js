import { Service, serviceManager } from 'soundworks/server';
import fs from 'fs';
import path from 'path';
import klawSync from 'klaw-sync';

const SERVICE_ID = 'service:drag-n-drop';

// supported media formats + json
// https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats
const regexp = /\.(wav|mp3)$/i;

class DragNDrop extends Service {
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

  _format(fullpath) {
    const basename = path.basename(fullpath);
    const uri = 'sounds/' + basename;

    return uri;
  }

  start() {
    super.start();

    const soundFilesPath = path.join(process.cwd(), this.options.soundFilePath);
    // get existing files
    const files = klawSync(soundFilesPath, { nodir: true });
    const audioFiles = files.filter(file => regexp.test(file.path));
    audioFiles.forEach(file => this.list.add(this._format(file.path)));

    fs.watch(soundFilesPath, { encoding: 'buffer' }, (eventType, filename) => {
      filename = filename.toString();

      if (eventType === 'rename') {
        const fullPath = path.join(soundFilesPath, filename);

        try {
          // crashes if file deleted
          const stats = fs.statSync(fullPath);
          const uri = this._format(fullPath);
          this.list.add(uri);

          this.emit('update', this.getList());
        } catch(err) {
          const uri = this._format(fullPath);
          this.list.delete(uri);
          // deleted
          this.emit('update', this.getList());
        }
      }
    });

    this.ready();
  }

  getList() {
    return Array.from(this.list);
  }
}

serviceManager.register(SERVICE_ID, DragNDrop);

export default DragNDrop;
