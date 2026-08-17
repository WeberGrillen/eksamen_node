<script>
    import { onMount, onDestroy } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';
    import { fetchGet } from '../../util/fetchUtil';
    import { BASE_URL } from '../../stores/generalStore';
    import io from 'socket.io-client';
    import CookingMode from '../../components/CookingMode/CookingMode.svelte';
    import heartIcon from '../../assets/heart.svg?raw';
    import heartFilledIcon from '../../assets/heart-fill.svg?raw';

    export let id;

    let socket;
    let recipe = null;
    let loading = true;
    let checked = {};
    let cooking = false;

    let likeCount = 0;
    let liked = false;

    onMount(async () => {
        try {
            const result = await fetchGet(`/api/recipes/${id}`);
            recipe = result.data.recipe;
            likeCount = recipe.like_count;
            liked = !!recipe.is_liked;
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not load recipe');
        } finally {
            loading = false;
        }

        socket = io($BASE_URL, {
            withCredentials: true
        });

        socket.on("server-sends-like-count", (data) => {
            if (data.recipeId === Number(id)) likeCount = data.count;
        })

        socket.on("server-sends-like-state", (data => {
            if (data.recipeId === Number(id)) liked = data.liked;
        }))
    });

    onDestroy(() => socket?.disconnect());

    function toggleLike() {
        socket?.emit("client-toggles-like", { recipeId: Number(id) });
    }

    function formatTimer(seconds) {
        return `${Math.round(seconds / 60)} min`;
    }
</script>

{#if loading}
    <p>Gathering recipes...</p>
{:else if !recipe}
    <p>Recipe does not exist.</p>
{:else}
    <article class="recipe-detail">
        <button class="back-btn" on:click={() => navigate('/discover')}>
            ‹ Back to feed
        </button>

        <div class="recipe-hero">
            {#if recipe.image_data}
                <img src={recipe.image_data} alt={recipe.title} />
            {:else}
                <span>photo · {recipe.title}</span>
            {/if}
        </div>

        <header class="recipe-header">
            <div class="recipe-header-top">
                <h1>{recipe.title}</h1>
                <div class="recipe-header-actions">
                    <button class="like-btn" class:liked on:click={toggleLike}>
                        <span class="heart">
                            {@html liked ? heartFilledIcon : heartIcon}</span>
                        {likeCount}
                    </button>
                    <button class="cook-btn" on:click={() => cooking = true}>▶ Start Cooking</button>
                </div>
            </div>
            <div class="recipe-header-bottom">
                <div class="recipe-author">
                    <span class="author-avatar"></span>
                    <span>{recipe.author_name}</span>
                </div>
                <p class="recipe-meta">
                    {recipe.total_minutes} min · {recipe.servings} servings · {recipe.difficulty}
                </p>
            </div>
        </header>

        {#if recipe.description}
            <p class="recipe-description">{recipe.description}</p>
        {/if}

        <div class="recipe-columns">
            <section>
                <h2 class="recipe-subtitle">Ingredients</h2>
                <ul class="ingredient-list">
                    {#each recipe.ingredients as ingredient, i}
                        <li>
                            <label class:done={checked[i]}>
                                <input type="checkbox" bind:checked={checked[i]} />
                                {ingredient.text}
                            </label>
                        </li>
                    {/each}
                </ul>
            </section>

            <section>
                <h2 class="recipe-subtitle">Method</h2>
                <ol class="step-list">
                    {#each recipe.steps as step, i}
                        <li>
                            <span class="step-number">{i + 1}</span>
                            <p>
                                {step.text}
                                {#if step.timer_seconds}
                                    <span class="step-timer">{formatTimer(step.timer_seconds)}</span>
                                {/if}
                            </p>
                        </li>
                    {/each}
                </ol>
            </section>
        </div>
        {#if cooking}
            <CookingMode {recipe} on:close={() => cooking = false} />
        {/if}
    </article>
{/if}