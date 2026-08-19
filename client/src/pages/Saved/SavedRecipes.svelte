<script>
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { fetchGet } from '../../util/fetchUtil';
    import RecipeCard from '../../components/RecipeCard/RecipeCard.svelte';

    let recipes = [];
    let loading = true;

    onMount(async () => {
        try {
            const result = await fetchGet('/api/recipes/saved');
            recipes = result.data.recipes;
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not load saved recipes');
        } finally {
            loading = false;
        }
    });
</script>

<div class="saved-page">
    <h1 class="saved-title">Your Cookbook</h1>

    {#if loading}
        <p class="profile-empty">Loading...</p>
    {:else if recipes.length === 0}
        <p class="profile-empty">Save recipes you like — they'll show up here.</p>
    {:else}
        <div class="recipe-grid">
            {#each recipes as recipe (recipe.id)}
                <RecipeCard {recipe} />
            {/each}
        </div>
    {/if}
</div>