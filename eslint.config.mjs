/**
 * 配置并启用 antfu 的 ESLint 配置方案。
 * 该函数接收一个对象参数，用于定制 antfu 配置方案。
 *
 * 参数:
 * - formatters: 是否启用自定义格式化器，true 表示启用。
 * - unocss: 是否启用 unocss 插件，true 表示启用。
 * - ignores: 一个数组，包含要忽略的文件路径模式。
 *
 * 返回值: 配置后的 ESLint 配置对象。
 */
// import antfu from '@antfu/eslint-config'

// export default antfu(
//   {
//     vue: true,
//     formatters: true, // 启用自定义格式化器
//     unocss: false, // 启用 unocss 插件
//     ignores: [
//       // 'bump.mzn.mjs',
//       '**/dist/**', // 忽略 dist 目录及其内容
//       '**/cdn/**', // ...globs 可以添加更多的忽略模式
//       '**/tools/**',
//       '**/__tests__/**',
//       '**/tests/**',
//       '**/*.test.js',
//       '**/*.test.ts',
//       '**/apps/**',
//       '**/.config/**',
//       '**/build/**',
//       '**/rslib-dist/**',
//       '**/docs/**',
//       '**/examples/**',
//       '**/coverage/**',
//       '**/node_modules/**', // 忽略 node_modules 目录及其内容
//       '**/*.json', // 忽略 tsconfig.json 文件
//       '**/*.md', // 忽略 md 文件
//     ],
//     stylistic: {
//       // 'no-console': 'off',
//       // 'no-tabs': 'off',
//       // 'no-tabs': ['error', { allowIndentationTabs: true }],
//       // 'no-unused-vars': 'warn', // 要求使用变量
//       // 'prefer-regex-literals': 'error', // 要求使用正则字面量
//       // 'eqeqeq': ['error', 'smart'], // 要求使用全等运算符
//     },
//     typescript: {
//       overrides: {
//         'ts/no-unused-vars': [
//           'error',
//           {
//             args: 'all',
//             argsIgnorePattern: '^_',
//             caughtErrors: 'all',
//             caughtErrorsIgnorePattern: '^_',
//             destructuredArrayIgnorePattern: '^_',
//             varsIgnorePattern: '^_',
//             ignoreRestSiblings: true,
//           },
//         ], // 禁止定义未使用的变量
//         'ts/no-inferrable-types': 'off', // 可以轻松推断的显式类型可能会增加不必要的冗长
//         'ts/no-namespace': 'off', // 禁止使用自定义 TypeScript 模块和命名空间。
//         'ts/no-explicit-any': 'off', // 禁止使用 any 类型
//         'ts/ban-ts-ignore': 'off', // 禁止使用 @ts-ignore
//         'ts/ban-types': 'off', // 禁止使用特定类型
//         'ts/explicit-function-return-type': 'off', // 不允许对初始化为数字、字符串或布尔值的变量或参数进行显式类型声明
//         'ts/no-var-requires': 'off', // 不允许在 import 语句中使用 require 语句
//         'ts/no-empty-function': 'off', // 禁止空函数
//         'ts/no-use-before-define': 'off', // 禁止在变量定义之前使用它们
//         'ts/ban-ts-comment': 'off', // 禁止 @ts-<directive> 使用注释或要求在指令后进行描述
//         'ts/no-non-null-assertion': 'off', // 不允许使用后缀运算符的非空断言(!)
//         'ts/explicit-module-boundary-types': 'off', // 要求导出函数和类的公共类方法的显式返回和参数类型
//       },
//     },
//   },
//   {
//     rules: {
//       'parser': 'off',
//       'style/max-statements-per-line': 'off',
//       'regexp/no-useless-quantifier': 'off',
//       'regexp/no-useless-range': 'off',
//       'regexp/no-useless-character-class': 'off',
//       'regexp/no-unused-space': 'off',
//       'regexp/no-super-linear-backtracking': 'off',
//       'unicorn/no-single-promise-in-promise-methods': 'off',
//       // 'no-unused-vars': 'warn', // 要求使用变量
//       // 'prefer-regex-literals': 'error', // 要求使用正则字面量
//       'eqeqeq': 'off', // 要求使用全等运算符
//       // 'no-tabs': 'off', // 禁止使用制表符
//       // 'indent': ['off', 2], // 强制使用 2 个空格的缩进
//       // 'ts/no-require-imports': 'off', // 允许 require 导入
//       'no-console': 'off',
//       'unicorn/no-empty-file': 'off',
//       // 'prefer-regex-literals': 'error',
//       // 'no-unused-vars': 'warn',
//       // 'regexp/no-unused-capturing-group': 'off',
//       'regexp/no-useless-dollar-replacements': 'off',
//       'regexp/no-unused-capturing-group': [
//         'off',
//         {
//           fixable: false,
//           allowNamed: false,
//         },
//       ],
//       'vitest/consistent-test-it': 'off',
//       'no-restricted-syntax': [
//         'error',
//         {
//           selector:
//             'CallExpression[callee.object.name=\'console\'][callee.property.name!=/^(log|warn|error|info|trace)$/]',
//           message: 'Unexpected property on console object was called',
//         },
//       ],
//     },
//   },
// )

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
