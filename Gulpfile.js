/*
 * webmachine
 * https://github.com/JonGretar/webmachine
 *
 * Copyright (c) 2014 Jon Gretar
 * Licensed under the MIT license.
 */

'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var stylish = require('jshint-stylish');

gulp.task('jshint', function () {
  return gulp.src(['./lib/**/*.js', './test/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

gulp.task('test', function () {
  return gulp.src('./test/*_test.js')
    .pipe(mocha({
      globals: ['chai'],
      timeout: 6000,
      ignoreLeaks: true,
      ui: 'bdd',
      reporter: 'spec'
    }));
});

// Rerun the task when a file changes
gulp.task('watch', function () {
  gulp.watch(['./lib/**/*.js', './test/**/*_test.js'], ['jshint']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['jshint', 'test', 'watch']);
