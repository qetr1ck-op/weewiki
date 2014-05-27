var gulp = require('gulp');

var jshint = require('gulp-jshint'),
    changed = require('gulp-changed'),
    imagemin = require('gulp-imagemin'),
    minifyHTML = require('gulp-minify-html');

gulp.task('jshint', function() {
    gulp.src(['./src/js/*.js', './*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('imagemin', function() {
    var imgSrc = './src/images/**/*',
        imgDst = './build/images';

    gulp.src(imgSrc)
        .pipe(changed(imgDst))
        .pipe(imagemin())
        .pipe(gulp.dest(imgDst));
});

gulp.task('htmlmin', function() {
    var htmlSrc = './src/*.html',
        htmlDst = './build';

    gulp.src(htmlSrc)
        .pipe(changed(htmlDst))
        .pipe(minifyHTML())
        .pipe(gulp.dest(htmlDst));
});

var concat = require('gulp-concat');
var stripDebug = require('gulp-strip-debug');
var uglify = require('gulp-uglify');

// JS concat, strip debugging and minify
gulp.task('jsmin', function() {
    gulp.src(['./src/js/*.js'])
        .pipe(concat('script.js'))
        .pipe(stripDebug())
        .pipe(uglify())
        .pipe(gulp.dest('./build/js/'));
});

var autoprefix = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');

// CSS concat, auto-prefix and minify
gulp.task('cssmin', function() {
    gulp.src(['./src/styles/*.css'])
        .pipe(concat('styles.css'))
        .pipe(autoprefix('last 2 versions'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./build/styles/'));
});

// default gulp task
gulp.task('default', ['imagemin', 'htmlmin', 'jsmin', 'cssmin'], function() {
    // watch for HTML changes
    gulp.watch('./src/*.html', function() {
        gulp.run('htmlmin');
    });

    // watch for JS changes
    gulp.watch('./src/js/*.js', function() {
        gulp.run('jshint', 'jsmin');
        console.log('js changes')
    });

    // watch for CSS changes
    gulp.watch('./src/styles/*.css', function() {
        gulp.run('cssmin');
    });
});