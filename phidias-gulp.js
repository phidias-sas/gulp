/*
Application structure (to be used with build())

myApp/
    src/

        global/
            module.js
            ...

        components/
            ...

        application/
            run.js
            config.js
            ...


The library

src/global/** /*.js
src/components/** /*.js  
---->  my-package.js

src/global/** /*.scss
src/components/** /*.scss
---->  my-package.css


The app (dependencies + library + states)

DEPENDENCY/MAIN.js
src/application/** /*.js  
---->  my-package.app.js

DEPENDENCY/MAIN.css
DEPENDENCY/global/** /*.scss
src/application/** /*.scss  
---->  my-package.app.js


*/

var path          = require('path');
var merge         = require('ordered-merge-stream');
var download      = require('gulp-download');
var concat        = require('gulp-concat');
var rename        = require('gulp-rename');
var sass          = require('gulp-sass');
var minifyCSS     = require('gulp-minify-css');
var uglify        = require('gulp-uglify');
var underscore    = require('underscore');
var underscoreStr = require('underscore.string');
var bower         = require('./phidias-bower.js');

module.exports = function(gulp) {

    var phidias = {

        tasks: [],

        task: function(taskName, task) {
            gulp.task(taskName, task);
            phidias.tasks.push(taskName);
            return taskName;
        },

        getCombinedStream: function(sources) {

            if (typeof sources == "string") {
                sources = [sources];
            }

            var streams = [];

            for (var cont = 0; cont < sources.length; cont++) {

                var source = sources[cont];

                if (source.substring(0, 4) == "http") {
                    streams.push(download(source));
                } else {
                    streams.push(gulp.src(source));
                }

            }

            return merge(streams);

        },


        watch: function(sources, triggerTask) {

            if (typeof sources == "string") {
                sources = [sources];
            }

            var watchable = [];
            for (var cont = 0; cont < sources.length; cont++) {
                var source = sources[cont];
                if (source.substring(0, 4) != "http") {
                    watchable.push(source);
                }
            }

            gulp.watch(watchable, [triggerTask]);

        },


        js: function(sources, target) {

            var newTask = phidias.task('writing JS file '+target, function() {

                var targetFolder = path.dirname(target);
                var fileName     = path.basename(target);
                var minFileName  = fileName.replace(".js", ".min.js");

                return phidias.getCombinedStream(sources)
                    .pipe(concat(fileName))
                    .pipe(gulp.dest(targetFolder))
                    .pipe(rename(minFileName))
                    .pipe(uglify()).on('error', logError)
                    .pipe(gulp.dest(targetFolder));

            });

            phidias.watch(sources, newTask);

        },

        css: function(sources, target) {

            var newTask = phidias.task('writing CSS file '+target, function() {

                var targetFolder = path.dirname(target);
                var fileName     = path.basename(target);
                var minFileName  = fileName.replace(".css", ".min.css");

                return phidias.getCombinedStream(sources)
                    .pipe(concat(fileName))
                    .pipe(sass()).on('error', logError)
                    .pipe(gulp.dest(targetFolder))
                    .pipe(rename(minFileName))
                    .pipe(minifyCSS()).on('error', logError)
                    .pipe(gulp.dest(targetFolder));            

            });

            phidias.watch(sources, newTask);

        },

        copy: function(sources, target) {

            var newTask = phidias.task("copying into "+target, function() {
                return gulp.src(sources).pipe(gulp.dest(target));
            });

            phidias.watch(sources, newTask);

        },

        build: function(options) {

            options.name     = options.name     == undefined ? 'client'                             : options.name;
            options.src      = options.src      == undefined ? path.dirname(module.parent.filename) : options.src;
            options.dest     = options.dest     == undefined ? options.src + '/public'              : options.dest;
            options.bowerDir = options.bowerDir == undefined ? options.src + '/bower_components'    : options.bowerDir;

            /* Components only */
            phidias.js([
                options.src + '/src/global/**/*.js',
                options.src + '/src/components/**/*.js'
            ], options.dest + '/build/'+options.name+'.js');

            phidias.css([
                options.src + '/src/global/**/*.scss',
                options.src + '/src/components/**/*.scss'
            ], options.dest + '/build/'+options.name+'.css');


            /* Bundled app */
            var dependencies = bower.getDependencies(options.src, options.bowerDir);        

            var mainFiles = {
                js:  [],
                css: []
            };

            underscore.mapObject(dependencies, function(packageData, packageName) {

                mainFiles.css.push(packageData.path + '/src/global/**/*.scss');

                if (packageData.bower.main === undefined) {
                    return;
                }

                var packageMainFiles = underscore.isArray(packageData.bower.main) ? packageData.bower.main : [packageData.bower.main];

                underscore.each(packageMainFiles, function(mainFile) {

                    if (underscoreStr.endsWith(mainFile, '.js')){
                        mainFiles.js.push(packageData.path + '/' + mainFile);
                    }

                    if (underscoreStr.endsWith(mainFile, '.css')){
                        mainFiles.css.push(packageData.path + '/' + mainFile);
                    }

                });
            });

            phidias.js(mainFiles.js.concat([
                options.dest + '/build/' + options.name + '.js',
                options.src + '/src/application/**/*.js'
            ]), options.dest + '/build/' + options.name + '.app.js');

            phidias.css(mainFiles.css.concat([
                options.dest + '/' + options.name + '.css',
                options.src + '/src/application/**/*.scss'
            ]), options.dest + '/build/' + options.name + '.app.css');
          
            // Move partials into public folder
            phidias.copy(options.src + '/src/application/states/**/*.html', options.dest + '/partials');

        }

    };

    gulp.task('default', phidias.tasks);    

    return {
        js:    phidias.js,
        css:   phidias.css,
        build: phidias.build
    };

};


//error handler to log errors without interrupting 'watch'
function logError(error) {
    console.log(error.toString());
    this.emit('end');
}