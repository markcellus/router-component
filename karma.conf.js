module.exports = function(config) {
    config.set({
        files: ['tests/**/*.ts', 'src/**/*.ts'],
        preprocessors: {
            '**/*.ts': ['karma-typescript'],
        },
        karmaTypescriptConfig: {
            compilerOptions: {
                module: "commonjs",
                sourceMap: true,
                target: "es6"
            },
            exclude: ["node_modules"]
        },
        reporters: ['progress', 'karma-typescript'],
        frameworks: ['mocha', 'karma-typescript'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless'],
        autoWatch: true,
        singleRun: true,
        concurrency: Infinity
    });
};
