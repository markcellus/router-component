import { esbuildPlugin } from '@web/dev-server-esbuild';
import { importMapsPlugin } from '@web/dev-server-import-maps';

export default {
    files: 'tests/*.ts',
    plugins: [
        esbuildPlugin({ ts: true, target: 'auto' }),
        importMapsPlugin({
            inject: {
                importMap: {
                    imports: {
                        'query-selector-shadow-dom':
                            '/tests/mocks/query-selector-shadow-dom.ts',
                    },
                },
            },
        }),
    ],
    nodeResolve: true,
};
