'use strict';
module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bt: {
            dist: 'dist',
            build: {
                files: {
                    'dist/route-manager.js': ['src/route-manager.js']
                },
                browserifyOptions: {
                    standalone: 'RouteManager'
                }
            },
            min: {
                files: {
                    'dist/route-manager-min.js': ['dist/route-manager.js']
                }
            },
            banner: {
                files: ['dist/*']
            },
            tests: {
                mocha: {
                    src: ['tests/*.js']
                }
            }
        }
    });

    grunt.loadNpmTasks('build-tools');
};