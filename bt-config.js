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
            src: ['tests/*.js'],
            requires: {
                // due to the way npm symlinking works, we must use the already-browserified
                // version of the module to allow for new es features
                'module-js': './node_modules/module-js/dist/module-min.js'
            }
        }
    }

};
