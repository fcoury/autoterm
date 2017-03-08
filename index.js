#! /usr/bin/env node

const toml = require('toml');
const fs = require('fs');
const applescript = require('applescript');
const _ = require('lodash');

const home = process.env.HOME;
const contents = fs.readFileSync(`${home}/.autotermrc`);
const apps = toml.parse(contents);

const app = process.argv[2];

if (!app) {
  console.error('usage: autoterm <app>');
  console.error(' apps:', Object.keys(apps).filter(app => app !== 'actions').join(', '));
  process.exit(3);
}

if (apps[app]) {
  let appDef = apps[app];
  let path;

  if (appDef.path) {
    path = appDef.path;
    appDef = _.omit(appDef, ['path']);
  }

  const childScript = makeScript(appDef, { path });

  const script = `
  tell application "iTerm"
    set theWindow to (current window)
    tell theWindow
      create tab with default profile
      tell current session of theWindow
        ${childScript}
      end tell
    end
  end tell
  `;

  applescript.execString(script, function(err, rtn) {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
  });
} else {
  console.error(`No app: ${app}`);
  console.error('  apps:', Object.keys(apps).filter(app => app !== 'actions').join(', '));
  process.exit(2);
}

function makeCommand(cmd, options) {
  let command = [];
  options = options || {};

  let path = cmd.path || options.path;

  if (path) {
    command.push(`cd ${path}`);
  }

  if (cmd.command) {
    command.push(cmd.command);
  }

  command = command.map(cmd => `write text "${cmd}"\n`);

  return command.join('');
}

function makeScript(commands, options) {
  let keys = Object.keys(commands);
  keys = [_.head(keys)].concat(_.reverse(_.tail(keys)));
  return keys.map((key, i) => {
    const cmd = commands[key];
    let script = makeCommand(cmd, options);
    if (i > 0) {
      script = `
              set newSplit to (split horizontally with default profile)
              tell newSplit
                ${script}
              end tell
              `;
    }
    return script;
  }).join("\n");
}
