import fs from 'node:fs';
import path from 'node:path';

import JSON5 from 'json5';

function getProjectConfig(projectName) {
  let projectConfig = null;

  // parse env config
  try {
    const projectConfigPath = path.join('projects', projectName, `config.json`);
    projectConfig = JSON5.parse(fs.readFileSync(projectConfigPath, 'utf-8'));
  } catch(err) {
    console.log(`Invalid "${projectName}" project config file`);
    process.exit(0);
  }

  return projectConfig;
}

export default getProjectConfig;
