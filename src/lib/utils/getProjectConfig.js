import fs from 'node:fs';
import path from 'node:path';

import JSON5 from 'json5';

function getProjectConfig(projectPathname) {
  let projectConfig = null;

  projectPathname = path.normalize(projectPathname);

  if (!fs.existsSync(projectPathname) || !fs.statSync(projectPathname).isDirectory()) {
    throw new Error(`Cannot get project configuration: project pathname "${projectPathname}" is not a directory`);
  }

  const configPathname = path.join(projectPathname, `config.json`)

  // parse env config
  try {
    projectConfig = JSON5.parse(fs.readFileSync(configPathname, 'utf-8'));
  } catch(err) {
    console.log(`> Invalid "${projectName}" project config file`);
    process.exit(0);
  }

  projectConfig.pathname = projectPathname;

  return projectConfig;
}

export default getProjectConfig;
