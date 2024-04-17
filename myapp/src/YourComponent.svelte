<script>
    import Backpack from './Backpack.svelte';
  
    let items = ['Sword', 'Shield', 'Potion'];
  
    // 在需要的时候添加物品到背包中
    function addItem() {
      items = [...items, 'New Item'];
    }
</script>

<h1>My RPG Game</h1>

<Backpack {items} />

<button on:click={addItem}>Add Item to Backpack</button>
  