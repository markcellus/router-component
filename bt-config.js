module.exports = {
    build: {
        files: {
            'dist/router.js': ['src/router.js']
        },
        browserifyOptions: {
            standalone: 'Router',
            transform: [
                [
                    "babelify",
                    {
                        "plugins": [
                            ["add-module-exports"] //so exports will work for dist file in browsers
                        ]
                    }
                ]
            ]
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
