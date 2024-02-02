import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.tsx',
  plugins: [
    typescript({
      compilerOptions: {
        "outDir": "dist",
        "declaration": true,
      }
    })
  ],
  output: {
    file: 'dist/index.js',
  }
}
