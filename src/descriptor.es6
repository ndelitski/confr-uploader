import fs from 'fs';
import path from 'path';
import http from 'http';
import Promise from 'bluebird';
import querystring from 'querystring';
import $url from 'url';
import {merge} from 'lodash';
import {info, debug} from './log';

const safeMatch = require('./util');

export class Descriptor {
  inherits = [];

  constructor({environment, version, stack, service, filePath}) {
    this.stack = stack;
    this.service = service;
    this.environment = environment;
    this.version = version;
    this.filePath = filePath;
    this.fileName = path.basename(this.filePath);
    this.content = fs.readFileSync(filePath, 'utf8');
  }

  print() {
    info(`${this.toString()}`);
    info('========================================================================');
    info(this.getContent());
  }

  getWeight() {
    var weight = 0b0000;
    if (this.stack) weight |= 1;
    if (this.environment) weight |= 2;
    if (this.version) weight |= 4;
    if (this.service) weight |= 8;
    return weight;
  }

  pathify(...args) {
    const arr = args.filter((i)=>!!i);

    return `/${arr.join('/')}`;
  }

  toString() {
    return this.pathify(this.stack, this.service, this.environment, this.version, this.fileName);
  }

  inheritFrom(prev) {
    if (prev instanceof ConfigJsonDescriptor) {
      this.inherits.push(prev);
    } else {
      throw new Error('descriptors can be merged only if same type')
    }
  }

  getContent() {
    return this.content;
  }

  valueOf() {
    return this.getWeight();
  }

  async upload({environments = [], backend}) {
    return await Promise.all(this.environment ? [this.environment] : environments)
      .map((e) => this._uploadFile({environment: e, backend}));
  }

  async _uploadFile({environment, backend}) {
    return await new Promise((resolve, reject) => {
      const fileName = Descriptor.cleanFileName(this.fileName.replace('conf-entry', 'entry'));
      const urlParsed = $url.parse(backend);
      const content = this.getContent();

      // make a request to a tunneling proxy
      var options = {
        method: 'POST',
        host: urlParsed.hostname,
        port: urlParsed.port ? parseInt(urlParsed.port) : 80,
        path: '/files?' + querystring.stringify({
          stack: this.stack,
          service: this.service,
          environment,
          version: this.version,
          name: fileName
        }),
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': urlParsed.auth && ('Basic ' + new Buffer(urlParsed.auth).toString('base64')),
          'Content-Length': content.length
        }
      };

      debug(`started POST ${options.host}:${options.port}${options.path}`);

      let req = http.request(options, (res) => {
        res.setEncoding('utf8');

        var body = '';
        res.on('data', function (d) {
          body += d;
        });

        res.on('end', () => {
          debug(`finished POST ${options.host}:${options.port}${options.path} with response:\n${body}`);
          // Data reception is done, do whatever with it!
          try {
            var parsed = JSON.parse(body);
            if (parsed.status !== 'ok') {
              reject(new Error(`failed upload ${this.filePath}, response: ${body}`))
            }
            else {
              resolve(this.pathify(this.stack, this.service, environment, this.version, Descriptor.cleanFileName(this.fileName)));
            }
          } catch (err) {
            throw new Error(`failed to parse response from  ${options.host}${options.path}: ${body}`);
          }
        });
      });

      req.on('error', reject);
      req.end(content);
    });
  }

  static forFile(fileName, ...props) {
    if (fileName.match(/config.*\.json$/)) {
      return new ConfigJsonDescriptor(...props);
    } else {
      return new Descriptor(...props);
    }
  }

  static parseFileName(fileName) {
    const version = safeMatch(fileName, /#([^@]+).*\./);
    const environment = safeMatch(fileName, /@([^#]+).*\./);
    return {version, environment};
  }

  static cleanFileName(filePath) {
    const fileName = path.basename(filePath);
    if (fileName.match(/[#@]/)) {
      return fileName.replace(/[#@].*(\.\w+)$/, '$1');
    } else {
      return fileName;
    }
  }

  static sortList(list) {
    return list.sort(function (a, b) {
      return a.valueOf() > b.valueOf() ? 1 : -1;
    });
  }

  static printTree(list) {
    for (let d of list) {
      info(`${d.toString()}`);
      for (let i of d.inherits) {
        info(`\t| ${i.toString()}`);
      }
      info(`json: ${d.getContent()}`)
    }
  }
}

/**
 * Describe config.json file
 */
export class ConfigJsonDescriptor extends Descriptor {
  json = JSON.parse(this.content);

  getContent() {
    const merged = {};
    this.inherits.forEach(function (j) {
      merge(merged, j.json)
    });

    return JSON.stringify(merge(merged, this.json), null, 4);
  }

  //async upload() {
  //    if (!this.stack || !this.service) {
  //        debug(`ignored ${this.filePath} due to not specified stack or services`);
  //        return;
  //    } else {
  //        return await super.upload();
  //    }
  //}
}
