<script>
    import { navigate } from 'svelte-routing'
    import { createEventDispatcher } from 'svelte';
    import { user } from '../../stores/userStore.js';

    import editIcon from '../../assets/pencil.svg?raw';
    import trashIcon from '../../assets/trash-2.svg?raw';

    export let recipe;
    export let showMenu = false;

    const dispatch = createEventDispatcher();

    let menuOpen = false;

    $: isOwner = $user && $user.id === recipe.user_id;

    function toggleMenu(event) {
        event.stopPropagation();
        menuOpen = !menuOpen;
    }

    function handleEdit(event) {
        event.stopPropagation();
        menuOpen = false;
        navigate(`/recipes/${recipe.id}/edit`);
    }

    function handleDelete(event) {
        event.stopPropagation();
        menuOpen = false;
        dispatch('delete', recipe.id);
    }
</script>

<svelte:window on:click={() => menuOpen = false} />


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
        <div class="recipe-card-text">
            <h3>{recipe.title}</h3>
            <p>{recipe.author_name} · {recipe.total_minutes} min</p>
        </div>

        {#if showMenu && isOwner}
            <div class="card-menu">
                <button class="card-menu-btn" on:click={toggleMenu} aria-label="Options">⋮</button>

                {#if menuOpen}
                    <div class="card-menu-dropdown">
                        <button on:click={handleEdit}>
                            {@html editIcon}
                            Edit recipe
                        </button>
                        <button on:click={handleDelete}>
                            {@html trashIcon}
                            Delete recipe
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

</article>