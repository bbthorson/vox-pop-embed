import { reactPreset } from '../../vitest-config/react';

export default reactPreset({
    test: {
        setupFiles: ['./src/test/setup.ts'],
    },
});
