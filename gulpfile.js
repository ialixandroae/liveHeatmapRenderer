var gulp = require('gulp');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var autoprefixer = require('gulp-autoprefixer');
var plumber = require('gulp-plumber');
var sourcemaps = require('gulp-sourcemaps');
var sass = require('gulp-sass');
var babel = require('gulp-babel');
var del = require('del');
var gls = require('gulp-live-server');
var livereload = require('gulp-livereload');


// File paths
var SCRIPTS_PATH = 'public/scripts/**/*.js';
var DIST_PATH = 'public/dist';

// CSS task
gulp.task('styles', function () {
    console.log("starting styles task");
    // 1st param in .src method specifies which files comes first, not loading after
    return gulp.src('public/scss/style.scss')
        .pipe(plumber(function(err) {
            console.log('Styles Task Error');
            console.log(err);
            this.emit('end');
        }))
        .pipe(sourcemaps.init())
        .pipe(autoprefixer())
        .pipe(sass({
            outputStyle: 'compressed'
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(DIST_PATH))
        .pipe(livereload())
});


// JS task
gulp.task('scripts', function () {
    console.log('starting scripts task');
    return gulp.src(SCRIPTS_PATH)
        .pipe(plumber(function (err) {
            console.log('Scripts Task Error');
            console.log(err);
            this.emit('end');
        }))
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(uglify())
        .pipe(concat('app.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(DIST_PATH))
        .pipe(livereload())
});

// Clean task
gulp.task('clean', function () {
    return del.sync([
        DIST_PATH
    ]);
});

gulp.task('serve', function(){
    var server = gls.static('dist', 8081);
    server.start();
});

// Default task
gulp.task('default', ['clean', 'styles', 'scripts'], function(){
    console.log('starting default task');
});

// Watch task
gulp.task('watch', ['default', 'serve'], function () {
    console.log('starting watch task');
    require('./server');
    livereload.listen();
    gulp.watch('public/scss/**/*.scss', ['styles']);
    gulp.watch(SCRIPTS_PATH, ['scripts'])
});
