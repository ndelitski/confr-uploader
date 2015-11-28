# rancher.confr-upload

Upload configuration files from a given directory to [confr-backend](https://github.com/ndelitski/rancher.confr-backend). Directory name is a stack name, subdirectories are services

## Install
```
npm -g i confr-upload
```
You may create alias
```
alias cu confr-upload
```

## Directory structure [example](https://github.com/ndelitski/rancher.confr.directory-tree-example)
```
|-stacks                                
|  |-stackA
|  |  |-service1                       
|  |  |  |-conf.es6                     ConfR configuration template. Can be used for bootstraping haproxy, nginx, rabbitmq.conf and etc
|  |  |  |-arbitrary[@env#version].file Arbitrary file
|  |  |  |-config[@env#version].json    Json-file on a service level. May have @env and #version markers
|  |  |-compose[@environment].yml       Docker compose file for stack with all it services
|  |  |-config.json                     Json-file on a stack level. Will be merged to service-env-version files
|  |-stackB
```

## Usage
```
$ cu --help

  Usage: confr-upload [options]

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -u, --url [url]        Url to confr-backend
    -e, --env [env]        Enviromnent for environment-less files. Comma-separated values
    -d, --dir [dir]        Stack files directory [default: cwd]
    -s, --stack [stack]    Override stack name [default: directory name]
    -f, --filter [filter]  Filter only services
```

```
$ pwd
/Users/ndelitski/repo/rancher.confr-directory-tree-example
$ LOG_LEVEL=debug node cu -d ./metadata-proxy -e qa,production -u http://user:super-password@localhost:3000
[INFO]   2015-11-28 21:10:16:924   Start upload...
[INFO]   2015-11-28 21:10:16:925   uploading conf.es6
[DEBUG]  2015-11-28 21:10:16:932   started POST localhost:3000/files?stack=metadata-proxy&service=proxy&environment=qa&version=&name=conf.es6
[DEBUG]  2015-11-28 21:10:16:940   started POST localhost:3000/files?stack=metadata-proxy&service=proxy&environment=production&version=&name=conf.es6
[DEBUG]  2015-11-28 21:10:16:959   finished POST localhost:3000/files?stack=metadata-proxy&service=proxy&environment=qa&version=&name=conf.es6 with response:
{"status":"ok"}
[DEBUG]  2015-11-28 21:10:16:983   finished POST localhost:3000/files?stack=metadata-proxy&service=proxy&environment=production&version=&name=conf.es6 with response:
{"status":"ok"}
[INFO]   2015-11-28 21:10:16:984   uploaded /metadata-proxy/proxy/qa/conf.es6
[INFO]   2015-11-28 21:10:16:984   uploaded /metadata-proxy/proxy/production/conf.es6
```

