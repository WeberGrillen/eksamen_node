<script>
    import { navigate } from 'svelte-routing'

    export let recipe;
</script>


<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article class="recipe-card" on:click={() => navigate(`/recipes/${recipe.id}`)}>
    <div class="recipe-card-img">
        {#if recipe.image_data}
            <img src={recipe.image_data} alt={recipe.title} />
        {:else}
            <span>photo</span>  
        {/if}
    </div>

    <div class="recipe-card-body">
        <h3>{recipe.title}</h3>
        <p>{recipe.author_name} · {recipe.total_minutes} min</p>
    </div>

</article>