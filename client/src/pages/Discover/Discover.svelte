<script>
    import { onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { fetchGet } from '../../util/fetchUtil';
    import Navbar from '../../components/Sidebar/Sidebar.svelte';
    import searchIcon from '../../assets/search.svg?raw';
    import RecipeCard from '../../components/RecipeCard/RecipeCard.svelte';
    import { toast } from 'svelte-sonner';

    let recipes = [];
    let query = '';
    let activeTag = 'All';
    let loading = true;

    const tags = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drinks'];

    $: filteredRecipe = recipes.filter((r) =>
        (activeTag === 'All' || r.category?.toLowerCase() === activeTag.toLowerCase()) &&
        r.title.toLowerCase().includes(query.toLowerCase())
    );

    onMount(async () => {
        try {
            const result = await fetchGet('/api/recipes');
            recipes = result.data.recipes;
        } catch (error) {
            toast.error(error.data.errorMessage)
            console.log(error)

        } finally {
            loading = false;
        }
    });

</script>

<div class="discover-page">
    <h1 class="discover-title">Discover</h1>
        <div class="search-bar">
            {@html searchIcon}
            <input type="text" placeholder="Search recipes, ingredients, cooks…" bind:value={query} />
        </div>
    <div class="discover-tags">
        {#each tags as tag}
            <button
                class="discover-tags-btn"
                class:active={activeTag === tag}
                on:click={() => activeTag = tag}
                >
                {tag}
            </button>
        {/each}
    </div>

    <div class="recipe-grid">
        {#each filteredRecipe as recipe (recipe.id)}
            <RecipeCard {recipe} />
        {/each}
    </div>
</div>