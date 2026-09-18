const fs = require('fs');

const origReadlink = fs.readlink;
const origReadlinkSync = fs.readlinkSync;
const origPromisesReadlink = fs.promises && fs.promises.readlink;

function fixError(err, p) {
  if (err && (err.code === 'EISDIR' || err.errno === -4068)) {
    const e = new Error(`EINVAL: invalid argument, readlink '${p}'`);
    e.code = 'EINVAL';
    e.errno = -4071;
    e.syscall = 'readlink';
    e.path = p;
    return e;
  }
  return err;
}

fs.readlink = function(p, options, callback) {
  let cb = typeof options === 'function' ? options : callback;
  let opt = typeof options === 'function' ? undefined : options;
  return origReadlink.call(fs, p, opt, (err, linkString) => {
    if (err) {
      err = fixError(err, p);
    }
    if (typeof cb === 'function') {
      cb(err, linkString);
    }
  });
};

fs.readlinkSync = function(p, options) {
  try {
    return origReadlinkSync.call(fs, p, options);
  } catch (err) {
    throw fixError(err, p);
  }
};

if (origPromisesReadlink) {
  fs.promises.readlink = async function(p, options) {
    try {
      return await origPromisesReadlink.call(fs.promises, p, options);
    } catch (err) {
      throw fixError(err, p);
    }
  };
}
