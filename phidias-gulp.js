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


The module

src/global/**.js
src/components/**.js
src/application/**.js
---->  my-module.js

src/global/**.scss
src/components/**.scss
src/application/**.scss
---->  my-module.css

*/

var path               = require('path');
var orderedMergeStream = require('ordered-merge-stream');
var download           = require('gulp-download');
var concat             = require('gulp-concat');
var rename             = require('gulp-rename');
var sass               = require('gulp-sass');
var minifyCSS          = require('gulp-minify-css');
var uglify             = require('gulp-uglify');
var templateCache      = require('gulp-angular-templatecache');

module.exports = function(gulp) {

    var phidias = {

        build: function(options) {

            options.home     = options.home     == undefined ? path.dirname(module.parent.filename) : options.home;
            options.name     = options.name     == undefined ? 'module'                             : options.name;
            options.src      = options.src      == undefined ? options.home + '/src/angular'        : options.src;
            options.dest     = options.dest     == undefined ? options.home + '/angular'            : options.dest;

            options.outputs = {
                templates: options.dest + '/templates.js',
                module: {
                    js: options.dest + '/' + options.name + '.js',
                    css: options.dest + '/' + options.name + '.css'
                }
            };

            options.sources = {
                templates: [options.src + '/**/*.html'],
                module: {
                    js: [
                        options.src + '/global/**/*.js',
                        options.src + '/components/**/*.js',
                        options.src + '/application/**/*.js',
                        options.outputs.templates
                    ],
                    css: [
                        options.src + '/global/**/*.scss',
                        options.src + '/components/**/*.scss',
                        options.src + '/application/**/*.scss'
                    ]
                }
            };

            phidias.templates('module.templates',
                options.sources.templates,
                options.outputs.templates,
                options.name
            );

            phidias.js('module.scripts',
                options.sources.module.js,
                options.outputs.module.js,
                ['module.templates']
            );

            phidias.sass('module.styles',
                options.sources.module.css,
                options.outputs.module.css
            );

            gulp.task('module', ['module.scripts', 'module.styles']);

            /* Default task: build module */
            gulp.task('default', ['module']);
        },


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

        templates: function(taskName, sources, target, moduleName) {

            var task = function() {

                var fileName     = path.basename(target);
                var targetFolder = path.dirname(target);

                return phidias.getCombinedStream(sources)
                    .pipe(templateCache(fileName, {
                        root: "/",
                        module: moduleName
                    }))
                    .pipe(rename(fileName))
                    .pipe(gulp.dest(targetFolder));
            };

            gulp.task(taskName, task);
            phidias.watch(sources, taskName);

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

        sass: function(taskName, sources, target, taskDependencies) {

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
        }

    };

    return phidias;

};

//error handler to log errors without interrupting 'watch'
function logError(error) {
    console.log(error.toString());
    this.emit('end');
}
