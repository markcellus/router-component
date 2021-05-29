module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    parserOptions: {
        sourceType: 'module',
    },
    env: {
        browser: true,
        node: true,
        es6: true,
        mocha: true,
    },
    globals: {
        YT: true,
    },
};
