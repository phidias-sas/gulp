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

src/global/**.js
src/components/**.js
---->  my-package.js

src/global/**.scss
src/components/**.scss
---->  my-package.css


The application

src/global/**.js
src/components/**.js
src/application/**.js
---->  my-package.app.js

src/global/**.scss
src/components/**.scss
src/application/**.scss
---->  my-package.app.css


The bundle (dependencies + library + application)

[dependendies]/main.js
my-package.app.js
---->  my-package.bundle.js

[dependendies]/main.css
my-package.app.css
---->  my-package.bundle.css


*/

var path               = require('path');
var merge              = require('merge-stream');
var orderedMergeStream = require('ordered-merge-stream');
var download           = require('gulp-download');
var concat             = require('gulp-concat');
var rename             = require('gulp-rename');
var sass               = require('gulp-sass');
var minifyCSS          = require('gulp-minify-css');
var uglify             = require('gulp-uglify');
var bower              = require('./phidias-bower.js');

module.exports = function(gulp) {

    var phidias = {

        watch: function(sources, triggerTaskName) {
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
            gulp.watch(watchable, [triggerTaskName]);
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

            return orderedMergeStream(streams);

        },


        js: function(taskName, sources, target, taskDependencies) {

            var task = function() {

                var targetFolder = path.dirname(target);
                var fileName     = path.basename(target);
                var minFileName  = fileName.replace(".js", ".min.js");

                return phidias.getCombinedStream(sources)
                    .pipe(concat(fileName))
                    .pipe(gulp.dest(targetFolder))
                    .pipe(rename(minFileName))
                    .pipe(uglify()).on('error', logError)
                    .pipe(gulp.dest(targetFolder));
            };

            if (taskDependencies) {
                gulp.task(taskName, taskDependencies, task);
            } else {
                gulp.task(taskName, task);
            }

            phidias.watch(sources, taskName);

        },


        css: function(taskName, sources, target, taskDependencies) {

            var task = function() {

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

            };

            if (taskDependencies) {
                gulp.task(taskName, taskDependencies, task);
            } else {
                gulp.task(taskName, task);
            }

            phidias.watch(sources, taskName);

        },

        copy: function(taskName, sources, target, taskDependencies) {

            var task = function() {
                return gulp.src(sources).pipe(gulp.dest(target));
            };

            if (taskDependencies) {
                gulp.task(taskName, taskDependencies, task);
            } else {
                gulp.task(taskName, task);
            }

            phidias.watch(sources, taskName);

        },

        concat: function(taskName, sources, target, taskDependencies) {

            var task = function() {

                var fileName     = path.basename(target);
                var targetFolder = path.dirname(target);

                return gulp.src(sources)
                    .pipe(concat(fileName))
                    .pipe(gulp.dest(targetFolder));
            };

            if (taskDependencies) {
                gulp.task(taskName, taskDependencies, task);
            } else {
                gulp.task(taskName, task);
            }

            phidias.watch(sources, taskName);

        },


        build: function(options) {

            options.name     = options.name     == undefined ? 'client'                             : options.name;
            options.src      = options.src      == undefined ? path.dirname(module.parent.filename) : options.src;
            options.dest     = options.dest     == undefined ? options.src + '/public'              : options.dest;
            options.bowerDir = options.bowerDir == undefined ? options.src + '/bower_components'    : options.bowerDir;

            /* Build stand-alone components */

            phidias.js('library.scripts',
                [
                    options.src + '/src/global/**/*.js',
                    options.src + '/src/components/**/*.js'
                ],
                options.dest + '/build/'+options.name+'.js'
            );

            phidias.css('library.styles',
                [
                    options.src + '/src/global/**/*.scss',
                    options.src + '/src/components/**/*.scss'
                ],
                options.dest + '/build/'+options.name+'.css'
            );

            gulp.task('library', ['library.scripts', 'library.styles']);


            /* Build application */

            phidias.js('application.scripts',
                [
                    options.src + '/src/global/**/*.js',
                    options.src + '/src/components/**/*.js',
                    options.src + '/src/application/**/*.js'
                ],
                options.dest + '/build/' + options.name + '.app.js'
            );

            phidias.css('application.styles',
                [
                    options.src + '/src/global/**/*.scss',
                    options.src + '/src/components/**/*.scss',
                    options.src + '/src/application/**/*.scss'
                ],
                options.dest + '/build/'+options.name+'.app.css'
            );

            phidias.copy('application.partials',
                options.src + '/src/application/states/**/*.html',
                options.dest + '/partials'
            );

            gulp.task('application', ['application.scripts', 'application.styles', 'application.partials']);


            /* Bundle all dependencies */

            var mainFiles = bower.getMainFiles(options.src, options.bowerDir);

            phidias.concat('bundle.scripts',
                mainFiles.js.concat([options.dest + '/build/' + options.name + '.app.min.js']),
                options.dest + '/build/' + options.name + '.bundle.js',
                ['application.scripts']
            );

            phidias.concat('bundle.styles',
                mainFiles.css.concat([options.dest + '/build/' + options.name + '.app.min.css']),
                options.dest + '/build/' + options.name + '.bundle.css',
                ['application.styles']
            );

            gulp.task('bundle', ['bundle.scripts', 'bundle.styles']);

            /* Default task: build library */
            gulp.task('default', ['library']);
        }

    };

    return phidias;

};

//error handler to log errors without interrupting 'watch'
function logError(error) {
    console.log(error.toString());
    this.emit('end');
}