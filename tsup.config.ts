import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        worker: 'src/worker/index.ts',
        'core/index': 'src/core/index.ts',
        'hooks/index': 'src/hooks/index.ts',
        'components/index': 'src/components/index.ts',
    },
    format: ['esm'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: true,
    external: ['react', 'react-dom'],
    esbuildOptions(options) {
        options.banner = {
            js: '// @xhiti/local-ai - Privacy-first AI skills for React',
        };
    },
    outExtension() {
        return {
            js: '.js',
        };
    },
});
