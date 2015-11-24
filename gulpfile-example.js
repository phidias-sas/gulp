var gulp    = require('gulp');
var phidias = require('/var/www/dev/sandbox/phidias/gulp/phidias-gulp.js')(gulp);

phidias.build({
    name:     'phidias-ui',
    src:      '/var/www/dev/sandbox/phidias/phidias-ui',
    bowerDir: '/var/www/dev/sandbox/phidias'
});