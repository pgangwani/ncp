

var assert = require('assert'),
    path = require('path'),
    rimraf = require('rimraf'),
    readDirFiles = require('read-dir-files'),
    ncp = require('../').ncp,
    fs = require('fs');


var fixtures = path.join(__dirname, 'fixtures'),
    src = path.join(fixtures, 'src'),
    out = path.join(fixtures, 'out');

describe('ncp', function () {
  before(function (cb) {
    rimraf(out, function() {
      ncp(src, out, cb);
    });
  });

  describe('when copying a directory of files', function () {
    it('files are copied correctly', function (cb) {
      readDirFiles(src, 'utf8', function (srcErr, srcFiles) {
        readDirFiles(out, 'utf8', function (outErr, outFiles) {
          assert.ifError(srcErr);
          assert.deepEqual(srcFiles, outFiles);
          cb();
        });
      });
    });
  });

  describe('when copying files using filter', function () {
    before(function (cb) {
      var filter = function(name) {
        return name.substr(name.length - 1) != 'a';
      };
      rimraf(out, function () {
        ncp(src, out, {filter: filter}, cb);
      });
    });

    it('files are copied correctly', function (cb) {
      readDirFiles(src, 'utf8', function (srcErr, srcFiles) {
        function filter(files) {
          for (var fileName in files) {
            var curFile = files[fileName];
            if (curFile instanceof Object)
              return filter(curFile);
            if (fileName.substr(fileName.length - 1) == 'a')
              delete files[fileName];
          }
        }
        filter(srcFiles);
        readDirFiles(out, 'utf8', function (outErr, outFiles) {
          assert.ifError(outErr);
          assert.deepEqual(srcFiles, outFiles);
          cb();
        });
      });
    });
  });

  describe('when using clobber=false', function () {
    it('the copy is completed successfully', function (cb) {
      ncp(src, out, function() {
        ncp(src, out, {clobber: false}, function(err) {
          assert.ifError(err);
          cb();
        });
      });
    });
  });

  describe('when using transform', function () {
    it('file descriptors are passed correctly', function (cb) {
      ncp(src, out, {
         transform: function(read,write,file) {
            assert.notEqual(file.name, undefined);
            assert.strictEqual(typeof file.mode,'number');
            read.pipe(write);
         }
      }, cb);
    });
  });

  describe('when using rename', function() {
    it('output files are correctly redirected', function(cb) {
      ncp(src, out, {
        rename: function(target) {
          if(path.basename(target) == 'a') return path.resolve(path.dirname(target), 'z');
          return target;
        }
      }, function(err) {
        if(err) return cb(err);

        readDirFiles(src, 'utf8', function (srcErr, srcFiles) {
          readDirFiles(out, 'utf8', function (outErr, outFiles) {
            assert.ifError(srcErr);
            assert.deepEqual(srcFiles.a, outFiles.z);
            cb();
          });
        });
      })
    })
  })

  describe('when using inflateSymlinks', function(cb) {
    it('copies the symlinked file instead of the symlink itself when true', function(cb) {
      ncp(src, out, {
        inflateSymlinks: true
      }, function(err) {
        if(err) return cb(err);

        fs.lstat(path.join(out, 'g'), function(err, stat) {
          assert.ok(!stat.isSymbolicLink());
          cb();
        });
      })
    });

    it('copies the symlink when false', function(cb) {
      ncp(src, out, {
        inflateSymlinks: false
      }, function(err) {
        if(err) return cb(err);

        fs.lstat(path.join(out, 'g'), function(err, stat) {
          assert.ok(stat.isSymbolicLink());
          cb();
        });
      })
    });
  });
});
