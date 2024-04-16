<script type="module">
    import * as Vue from 'vue';
    var global = window;
    global.Vue = Vue;
    const greeting = Vue.ref('Hello World!');
</script>

<template>
    <p class="greeting">{{ greeting }}</p>
</template>

<style>
    .greeting {
        color: red;
        font-weight: bold;
    }
</style>