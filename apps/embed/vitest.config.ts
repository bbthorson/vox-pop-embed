import { nodePreset } from '../../vitest-config/node';

// Only the embed's data layer is tested here (src/lib), which needs no DOM.
export default nodePreset({
    test: {
        include: ['src/**/*.test.ts'],
    },
});
