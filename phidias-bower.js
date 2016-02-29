var fs            = require('fs');
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

    getMainFiles: function(dir, bowerDir) {

        var dependencies = bower.getDependencies(dir, bowerDir);

        var mainFiles = {
            js:   [],
            css:  []
        };

        underscore.mapObject(dependencies, function(packageData, packageName) {

            if (packageData.bower === undefined || packageData.bower.main === undefined) {
                return;
            }

            var packageMainFiles = underscore.isArray(packageData.bower.main) ? packageData.bower.main : [packageData.bower.main];

            underscore.each(packageMainFiles, function(mainFile) {

                if (underscoreStr.endsWith(mainFile, '.js')){
                    var minFile = mainFile.replace('.js', '.min.js');
                    if (fs.existsSync(packageData.path + '/' + minFile)) {
                        mainFiles.js.push(packageData.path + '/' + minFile);
                    } else {
                        mainFiles.js.push(packageData.path + '/' + mainFile);
                    }
                }

                if (underscoreStr.endsWith(mainFile, '.css')) {
                    var minFile = mainFile.replace('.css', '.min.css');
                    if (fs.existsSync(packageData.path + '/' + minFile)) {
                        mainFiles.css.push(packageData.path + '/' + minFile);
                    } else {
                        mainFiles.css.push(packageData.path + '/' + mainFile);
                    }
                }

            });

        });

        return mainFiles;
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