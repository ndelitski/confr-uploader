import fs from 'fs';
import path from 'path';
import {pairs, groupBy} from 'lodash';
import {Descriptor, ConfigJsonDescriptor} from './descriptor';
import {info, debug, error} from './log';

export default async function aggregateStackFiles({dir, stack, serviceFilter, envFilter}) {
  const descriptors = [];
  let services = [];
  const stackLevelFilesPath = dir;
  const stackLevelFiles = fs.readdirSync(stackLevelFilesPath);

  if (serviceFilter) {
    services = [serviceFilter];
  } else {
    services = stackLevelFiles.filter((f) => fs.statSync(path.join(stackLevelFilesPath, f)).isDirectory());
  }

  // walk in stack directory
  for (let f of stackLevelFiles) {
    const filePath = path.join(stackLevelFilesPath, f);
    const [__, fileName] = filePath.replace(/.*stacks\//, '').split('/');
    const {version, environment} = Descriptor.parseFileName(fileName);
    if (environment && envFilter.indexOf(environment) < 0) {
      debug(`>>>> ${filePath} ignored due to env filter: ${envFilter}`);
      continue;
    }

    if (fs.statSync(filePath).isFile()) {
      if (fileName.match(/compose.*\.yml$/)) {
        debug(`>>>> ${filePath} ignored`);
        continue;
      }

      descriptors.push(Descriptor.forFile(filePath, {stack, environment, version, filePath: filePath}));
    }
  }

  for (let service of services) {
    // walk in service directory
    const serviceLevelFilesPath = path.join(stackLevelFilesPath, service);
    const serviceLevelFiles = fs.readdirSync(serviceLevelFilesPath);

    for (let f of serviceLevelFiles) {
      const filePath = path.join(serviceLevelFilesPath, f);
      const [__, service, fileName] = filePath.replace(/.*stacks\//, '').split('/');
      const {version, environment} = Descriptor.parseFileName(fileName);
      if (environment && envFilter.indexOf(environment) < 0) {
        debug(`>>>> ${filePath} ignored due to env filter: ${envFilter}`);
        continue;
      }

      if (fs.statSync(filePath).isFile()) {
        if (fileName.match(/compose.*\.yml$/)) {
          console.log(`>>>> ${filePath} ignored`);
          continue;
        }
        descriptors.push(Descriptor.forFile(filePath, {
          stack,
          service,
          environment,
          version,
          filePath: path.resolve(filePath)
        }));
      }
    }
  }

  const byFile = groupBy(descriptors, (d) => Descriptor.cleanFileName(d.filePath));

  for (let [f, list] of pairs(byFile)) {
    const sorted = Descriptor.sortList(list);
    byFile[f] = sorted;
    if (f.match(/config\.json$/)) {
      sorted.reduce((prevElements, d) => {
        prevElements.forEach((prev) => {
          if ((prev.stack ? d.stack == prev.stack : true)
            && (prev.service ? d.service == prev.service : true)
            && (prev.environment ? d.environment == prev.environment : true)
            && (prev.version ? d.version == prev.version : true)
          ) {
            d.inheritFrom(prev);
          }
        });
        return prevElements.concat(d);
      }, []);
    }
  }

  return byFile;
}

