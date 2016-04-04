'use strict';
module.exports = {
    dist: 'dist',
    build: {
        files: {
            'dist/router.js': ['src/router.js']
        },
        browserifyOptions: {
            standalone: 'Router'
        },
        minifyFiles: {
            'dist/router-min.js': ['dist/router.js']
        },
        bannerFiles: ['dist/*']
    },
    tests: {
        mocha: {
            src: ['tests/*.js']
        }
    }

};
