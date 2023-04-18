import typescript from '@rollup/plugin-typescript';
import shebang from 'rollup-plugin-add-shebang';

export default [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      format: 'es',
    },
    plugins: [typescript()],
  },
  {
    input: 'src/toolkit-iterate.ts',
    output: {
      dir: 'dist',
      format: 'es',
    },
    plugins: [
      typescript(),
      shebang({
        include: ['dist/toolkit-iterate.js'],
      }),
    ],
  },
];
