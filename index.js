'use strict';

var through = require('through2'),
    pluginError = require('gulp-util').PluginError,
    fs = require('fs'),
    path = require('path');
var PLUGIN_NAME = 'gulp-localStore';


function insertCode(fileContents) {
    var insertPos = fileContents.lastIndexOf("</\ltag>");
    var uglifyJs = require('uglify-js');

    var storeCode = uglifyJs.minify(path.resolve(__dirname, "lib", "code.js")).code;
    if (insertPos > -1) {
        fileContents = fileContents.slice(0, insertPos + 7) + "\n<script>\n"
                     + storeCode + "\n</\script>\n"
                     + fileContents.slice(insertPos + 7);
    }
    return fileContents;
}

function canStore() {
    var options = process.argv;
    for (var i = 0, len = options.length; i < len; i++) {
        if (options[i].indexOf("-l") != -1) {
            return true;
        }
    }
    return false;
}

module.exports = function() {
    return through.obj(function(file, encoding, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams not supported!'));
            return callback();
        }
        
        if (!canStore()) {
            return callback(null, file);
        }

        var fileContents = file.contents.toString();
        fileContents = insertCode(fileContents);
        file.contents = new Buffer(fileContents);
        callback(null, file);

    });
}