<!-- 背包 -->
<script>

  import Sprite from "../base/Sprite.svelte";

  import { afterUpdate } from 'svelte';

  let top;
  let selector;

  let totalWidth = 0;
  let mapping = new Map();
	// afterUpdate(() => {
  //   console.log(selector);
	// 	let sprites = top.getElementsByTagName('u_sprite');
  //   sprites = Array.prototype.slice.call(sprites);
  //   totalWidth = 0;
  //   sprites.forEach(sprite => {
  //     if(selector == sprite) return;
  //     console.warn(sprite);
  //     if(sprite == select){
  //       totalWidth = sprite.offsetHeight;
  //     }
  //   });
	// });

  let display = 'flex';

  //单元测试 (UI数据独立测试)
  let items = [
    {name:undefined}, {name:'unit test'}, {name:'unit test1111111'}
  ]

  let select = null;
  let count = -1;
  let selectTest = function(){
    count++;
    if(count >= items.length){
      count = 0;
    }
    select = items[count];
    if(select.sprite){
      totalWidth = select.sprite.$$.ctx[14]().offsetLeft;
    }
  }

  let spriteRef = (item, sprite)=>{
    mapping.set(item, sprite);
  }

  let itemSprite;
  
</script>

<u_backpack bind:this={top}>
  <Sprite left={totalWidth} bind:this={selector} text="S" top=50/>
  {#each items as item, index}
    {#if item.name }
    <!-- 侦听工作流 -->
      <Sprite text={item.name} create={(item)=>{spriteRef(item)}}/>
    {/if}
  {/each}
  <button on:click={selectTest}>
    tttttt
  </button>
</u_backpack>

<!-- 如何使用 data -->
