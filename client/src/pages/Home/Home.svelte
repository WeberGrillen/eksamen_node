<script>
    import Navbar from '../../components/Sidebar/Sidebar.svelte';

    let trending = [];

    onMount(async () => {
        try {
            const result = await fetchGet('/api/recipes/trending');
            trending = result.data.recipes;
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not load trending');
        }
    });

</script>



<div class="homepage-filler">
    {#if trending.length > 0}
        <h2 class="discover-section-title">Trending this week</h2>
        <div class="recipe-grid">
            {#each trending as recipe (recipe.id)}
                <RecipeCard {recipe} />
            {/each}
        </div>
    {/if}
</div>
