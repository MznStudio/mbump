import mznjs from '@mznjs/eslint-config'

export default mznjs(
  {
    mznjs: {
      overrides: {
        // 'jsdoc/require-jsdoc': 'off',
        // 'jsdoc/check-param-names': 'off',
      },
    },
    vue: true,
    formatters: true,
    unocss: false,
    ignores: [
      '**/dist/**',
      '**/cdn/**',
      '**/tools/**',
      '**/__tests__/**',
      '**/tests/**',
      '**/*.test.js',
      '**/*.test.ts',
      '**/apps/**',
      '**/.config/**',
      '**/build/**',
      '**/rslib-dist/**',
      '**/docs/**',
      '**/examples/**',
      '**/coverage/**',
      '**/node_modules/**', // 忽略 node_modules 目录及其内容
      '**/*.json', // 忽略 tsconfig.json 文件
      '**/*.md', // 忽略 md 文件
    ],
    stylistic: {
      indent: 2,
      quotes: 'single',
      braceStyle: 'stroustrup',
      commaDangle: 'only-multiline', // 多行时末尾加逗号
      eqeqeq: true, // 强制使用 ===
      blockSpacing: true, // 块级作用域内加空格
      objectCurlySpacing: true, // 对象花括号内加空格
    },
  },
)
