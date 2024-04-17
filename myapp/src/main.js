import YourComponent from './YourComponent.svelte';

const app = new YourComponent({
  target: document.body,
  props: {
    // 这里可以传递给组件的属性
    name: 'World'
  }
});

export {YourComponent};
