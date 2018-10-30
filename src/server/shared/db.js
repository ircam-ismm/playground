import fs from 'fs';
import path from 'path';


const dbFile = path.join(process.cwd(), 'db.json');

const db = {
  retrieve() {
    if (fs.existsSync(dbFile)) {
      const data = fs.readFileSync(dbFile);

      try {
        const json = JSON.parse(data);
        return json;
      } catch(err) {
        console.log('an error occured while reading the application state');
        return [];
      }
    } else {
      return [];
    }
  },

  persist(model) {
    try {
      const json = JSON.stringify(model, null, 2);
      fs.writeFileSync(dbFile, json);
    } catch(err) {
      console.log('an error occured while saving the application state');
    }
  },
};

export default db;
