import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/router-component.ts',
    output: [
        {
            format: 'cjs',
            file: 'dist/router-component.common.js',
        },
        {
            format: 'esm',
            file: 'dist/router-component.js',
        },
    ],
    plugins: [
        resolve(),
        typescript(),
        !process.env.ROLLUP_WATCH &&
            terser({
                compress: true,
                mangle: true,
            }),
    ],
    watch: {
        include: 'src/**',
    },
};
