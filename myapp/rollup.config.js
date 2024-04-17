import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import css  from 'rollup-plugin-css-only';

export default {
  input: {
    // 指定所有需要编译的 Svelte 组件文件
    component1: 'src/YourComponent.svelte',
    // component2: 'src/component2.svelte'
    // 添加其他组件文件...
  },
  output: {
    // 输出文件的路径和文件名
    dir: 'static',
    format: 'umd',
	name: 'YourLibrary' // 这里替换为你的库名称
  },
  plugins: [
    svelte(), // 使用 Svelte 插件
    resolve(), // 解析依赖模块
    commonjs(), // 将 CommonJS 模块转换为 ES
  ]
};
