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


The package

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


The bundle (dependencies + application)

[dependendies]/main.js
my-package.app.js
---->  my-package.bundle.js

[dependendies]/main.css
my-package.app.css
---->  my-package.bundle.css


*/

var path               = require('path');
var orderedMergeStream = require('ordered-merge-stream');
var download           = require('gulp-download');
var concat             = require('gulp-concat');
var rename             = require('gulp-rename');
var sass               = require('gulp-sass');
var minifyCSS          = require('gulp-minify-css');
var uglify             = require('gulp-uglify');
var bower              = require('./phidias-bower.js');
var templateCache      = require('gulp-angular-templatecache');

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

                return phidias.getCombinedStream(sources)
                    .pipe(concat(fileName))
                    .pipe(sass()).on('error', logError)
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


            options.outputs = {
                templates: options.dest + '/build/templates.js',
                package: {
                    js: options.dest + '/build/' + options.name + '.js',
                    css: options.dest + '/build/' + options.name + '.css'
                },
                application: {
                    js: options.dest + '/build/' + options.name + '.app.js',
                    css: options.dest + '/build/'+options.name+'.app.css'
                },
                dependencies: {
                    js: options.dest + '/build/' + options.name + '.dependencies.js',
                    css: options.dest + '/build/' + options.name + '.dependencies.css'
                },
                bundle: {
                    js: options.dest + '/build/' + options.name + '.bundle.js',
                    css: options.dest + '/build/' + options.name + '.bundle.css'
                }
            };


            options.sources = {
                templates: [options.src + '/src/**/*.html'],
                package: {
                    js: [
                        options.src + '/src/global/**/*.js',
                        options.src + '/src/components/**/*.js',
                        options.outputs.templates
                    ],
                    css: [
                        options.src + '/src/global/**/*.scss',
                        options.src + '/src/components/**/*.scss'
                    ]
                },
                application: {
                    js: [
                        options.src + '/src/global/**/*.js',
                        options.src + '/src/components/**/*.js',
                        options.src + '/src/application/**/*.js',
                        options.outputs.templates
                    ],
                    css: [
                        options.src + '/src/global/**/*.scss',
                        options.src + '/src/components/**/*.scss',
                        options.src + '/src/application/**/*.scss'
                    ]
                }
            };



            /* Build stand-alone (package) components */

            phidias.templates('package.templates',
                options.sources.templates,
                options.outputs.templates,
                options.name
            );

            phidias.js('package.scripts',
                options.sources.package.js,
                options.outputs.package.js,
                ['package.templates']
            );

            //phidias.css('package.styles',
            phidias.sass('package.styles',
                options.sources.package.css,
                options.outputs.package.css
            );

            gulp.task('package', ['package.scripts', 'package.styles']);


            /* Build application */

            phidias.js('application.scripts',
                options.sources.application.js,
                options.outputs.application.js,
                ['package.templates']
            );

            //phidias.css('application.styles',
            phidias.sass('application.styles',
                options.sources.application.css,
                options.outputs.application.css
            );

            gulp.task('application', ['application.scripts', 'application.styles']);



            /* Concatenate all dependencies */
            var allDependencies = bower.getMainFiles(options.src, options.bowerDir);

            phidias.concat('dependencies.scripts',
                allDependencies.js,
                options.outputs.dependencies.js
            );

            phidias.concat('dependencies.styles',
                allDependencies.css,
                options.outputs.dependencies.css
            );

            gulp.task('dependencies', ['dependencies.scripts', 'dependencies.styles']);



            /* Bundle app with dependencies */

            //phidias.js('bundle.scripts',   // use this line to uglify all output
            phidias.concat('bundle.scripts',
                [
                    options.outputs.dependencies.js,
                    options.outputs.application.js
                ],
                options.outputs.bundle.js,
                ['dependencies.scripts', 'application.scripts']
            );

            //phidias.css('bundle.styles',  // use this line to minify all output css
            phidias.concat('bundle.styles',
                [
                    options.outputs.dependencies.css,
                    options.outputs.application.css
                ],
                options.outputs.bundle.css,
                ['dependencies.styles', 'application.styles']
            );

            gulp.task('bundle', ['bundle.scripts', 'bundle.styles']);

            /* Default task: build package */
            gulp.task('default', ['package']);
        }

    };

    return phidias;

};

//error handler to log errors without interrupting 'watch'
function logError(error) {
    console.log(error.toString());
    this.emit('end');
}