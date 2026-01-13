function parseArgs(argv) {
  const positional = [];
  const flags = {};
  const rest = [];
  let afterDoubleDash = false;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (afterDoubleDash) {
      rest.push(arg);
      continue;
    }

    if (arg === '--') {
      afterDoubleDash = true;
      continue;
    }

    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex !== -1) {
        const key = arg.slice(2, equalIndex);
        const value = arg.slice(equalIndex + 1);
        flags[key] = value === '' ? true : value;
        continue;
      }

      const key = arg.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        index++;
      } else {
        flags[key] = true;
      }
      continue;
    }

    positional.push(arg);
  }

  return { positional, flags, rest };
}

module.exports = {
  parseArgs
};
