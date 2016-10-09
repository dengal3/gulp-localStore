var localStore = require('./index.js'),
    gulp = require('gulp');

gulp.task('default', function() {
    gulp.src(['test/src/index.html'])
        .pipe(localStore())
        .pipe(gulp.dest('test/dest'));
})