import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';

export default {
    input: 'src/router-component.ts',
    output: {
        format: 'esm',
        file: 'dist/router-component.js'
    },
    plugins: [
        resolve(),
        typescript()
    ],
    watch: {
        include: 'src/**'
    }
};