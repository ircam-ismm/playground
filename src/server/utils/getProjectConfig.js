import fs from 'fs';
import JSON5 from 'json5';
import path from 'path';

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
