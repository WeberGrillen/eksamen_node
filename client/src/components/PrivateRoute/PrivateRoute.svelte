<script>
    import { onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { get } from 'svelte/store';
    import { user, checkAuth } from '../../stores/userStore.js';

    let loading = true;

    onMount(async () => {
        await checkAuth();

        loading = false;

        if (!get(user)) {
            navigate('/login');
            return;
        }
    });
</script>

{#if !loading}
    <slot />
{/if}