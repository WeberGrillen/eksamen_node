<script>
    import { navigate } from 'svelte-routing';
    import { get } from 'svelte/store';
    import { user, checkAuth } from '../../stores/userStore.js';

    let loading = true;

    checkAuth().then(() => {
        if (!get(user)) {
            navigate('/login');
        }
        loading = false;
    });
</script>

{#if !loading}
    <slot />
{/if}