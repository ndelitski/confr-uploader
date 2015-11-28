import fs from 'fs';
import path from 'path';
import aggregateStackFiles from './service-aggregator';
import {pairs, groupBy, keys} from 'lodash';
import Promise from 'bluebird';
import {info, debug, error} from './log';
import program from 'commander';
import assert from 'assert';

const {
  CONFR_BACKEND
} = process.env;

program
  .version(require('../package.json').version)
  .option('-u, --url [url]', 'Url to confr-backend', CONFR_BACKEND)
  .option('-e, --env [env]', 'Enviromnent for environment-less files. Comma-separated values', getEnvironmentsFromRancherProfiles())
  .option('-d, --dir [dir]', 'Stack files directory [default: cwd]', process.cwd())
  .option('-s, --stack [stack]', 'Override stack name [default: directory name]')
  .option('-f, --filter [filter]', 'Filter only services')
  .parse(process.argv);

(async ({dir, stack, url, env, filter}) => {
  if (!stack) {
    stack = path.basename(dir);
  }

  assert(env, '-e [env] is missing');
  assert(url, '-u, --url [url] is missing');

  const byFile = await aggregateStackFiles(dir, stack, filter);
  info('Start upload...');
  for (let [f, list] of pairs(byFile)) {
    info(`uploading ${f}`);
    for (let d of list) {
      const uploads = await d.upload({environments: env.split(',').map((s) => s.trim()), backend: url}); // if file have env dont override
      for (let filePath of uploads) {
        info(`uploaded ${filePath}`);
      }
    }
    info('--------------------')
  }
})(program).catch((err) => {
  error(err);
  error(err.stack);
  process.exit(1);
});

function getEnvironmentsFromRancherProfiles() {
  return tryRancherConfigPath(path.join(process.cwd(), '.rancher'))
    || tryRancherConfigPath(path.join(home(), '.rancher'));
}

function tryRancherConfigPath(configPath) {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return keys(config.profiles).join(',');
  }
}

function home() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}
