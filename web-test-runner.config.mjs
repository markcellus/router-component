import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
    files: 'tests/**/*.ts',
    plugins: [esbuildPlugin({ ts: true, target: 'auto' })],
    nodeResolve: true,
};
