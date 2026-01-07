import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  plugins: [
    typescript({
      compilerOptions: {
        "outDir": "dist",
        "declaration": true,
      },
      include: ['src/**/*.ts', 'src/**/*.tsx'],
    })
  ],
  external: ['react', 'react-dom'],
  output: {
    file: 'dist/index.js',
    format: 'esm',
  }
}
