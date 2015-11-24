var underscore    = require('underscore');
var underscoreStr = require('underscore.string');

var bower = {

    packages: [],
    exclude:  [],

    getDependencies: function(dir, bowerDir) {

        if (dir == undefined) {
            dir = '.';
        }

        if (bowerDir == undefined) {
            bowerDir = dir + '/bower_components';
        }

        var bowerFile = require(dir + '/bower.json');

        // calculate the order of packages
        underscore.each(bowerFile.dependencies, function(value, key) {
            bower.addPackage(key, bowerDir);
        });

        return bower.packages;
    },

    addPackage: function(name, bowerDir) {

        if (bower.exclude.indexOf(name) !== -1) {
            return;
        }

        // package info and dependencies
        try {
            var bowerFile = require(bowerDir + '/' + name + '/bower.json');

            // add dependencies by repeat the step
            if (!!bowerFile.dependencies) {
                underscore.each(bowerFile.dependencies, function(value, key) {
                    bower.addPackage(key, bowerDir);
                });
            }

        } catch (e) {
            console.log("phidias-gulp ERROR:", e);
        }

        if (bower.packages[name] === undefined) {
            bower.packages[name] = {
                path: bowerDir + '/' + name,
                bower: bowerFile
            };
        }
    }

};


module.exports = bower;