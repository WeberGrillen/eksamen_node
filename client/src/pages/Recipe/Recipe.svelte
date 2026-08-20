<script>
    import { onMount, onDestroy } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';
    import { fetchDelete, fetchGet, fetchPost } from '../../util/fetchUtil';
    import { formatMinutes } from '../../util/timeUtil.js';

    import { BASE_URL } from '../../stores/generalStore';
    import { user } from '../../stores/userStore';
    import io from 'socket.io-client';

    import CookingMode from '../../components/CookingMode/CookingMode.svelte';

    import heartIcon from '../../assets/heart.svg?raw';
    import heartFilledIcon from '../../assets/heart-fill.svg?raw';
    import bookmarkIcon from '../../assets/bookmark.svg?raw';
    import bookmarkFilledIcon from '../../assets/bookmark-fill.svg?raw';
    import backIcon from '../../assets/arrow-left.svg?raw';

    export let id;

    let socket;

    let recipe = null;
    let loading = true;

    let checked = {};
    let cooking = false;

    let likeCount = 0;
    let liked = false;

    let saved = false;
    let following = false;

    let comments = [];
    let commentDraft = "";

    $: isOwnRecipe = Boolean(
        recipe &&
        $user &&
        Number($user.id) === Number(recipe.user_id)
    );

    async function load() {
        try {
            const result = await fetchGet(`/api/recipes/${id}`);

            recipe = result.data.recipe;

            likeCount = recipe.like_count ?? 0;
            liked = !!recipe.is_liked;
            saved = !!recipe.is_saved;
            following = !!recipe.is_following;

            comments = recipe.comments ?? [];

            // Reset lokale states når vi åbner en ny recipe
            checked = {};
            cooking = false;

        } catch (error) {
            recipe = null;
            toast.error(error?.data?.errorMessage ?? 'Could not load recipe');
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        await load();

        socket = io($BASE_URL, {
            withCredentials: true
        });

        socket.on("server-sends-like-count", (data) => {
            if (data.recipeId === Number(id))
                likeCount = data.count;
        })

        socket.on("server-sends-like-state", (data) => {
            if (data.recipeId === Number(id)) 
                liked = data.liked;
        })


        socket.on("server-sends-follow-state", (data) => {
            if (recipe && Number(data.userId) === Number(recipe.user_id)) {
                following = data.following;
            }
        });

        socket.on('server-sends-comment', onComment);
        socket.on('server-deletes-comment', onCommentDeleted);
    });

    onDestroy(() => {
        socket?.disconnect();
    });

    function toggleLike() {
        socket?.emit("client-toggles-like", {
            recipeId: Number(id)
        });
    }

    async function toggleSaved() {
        const previousState = saved;

        saved = !saved;

        try {
            if (previousState) {
                await fetchDelete(`/api/recipes/${id}/save`);
            } else {
                await fetchPost(`/api/recipes/${id}/save`);
            }
        } catch (error) {
            saved = previousState;
            toast.error(error?.data?.errorMessage ?? 'Could not update');
        }
    }

    function toggleFollow() {
        if (!recipe) return;

        socket?.emit("client-toggles-follow", {
            userId: Number(recipe.user_id)
    });
}

    function onComment(data) {
        if (Number(data.recipeId) !== Number(id)) return; 
        
        comments = [...comments, data.comment];
    }

    function onCommentDeleted(data) {
        if (Number(data.recipeId) !== Number(id)) return;

        comments = comments.filter(
            (comment) => Number(comment.id) !== Number(data.commentId)
        );
    }

    function sendComment() {
        const text = commentDraft.trim();
        if (!text || !socket) return;

        socket.emit('client-sends-comment', {
            recipeId: Number(id),
            text
        });

        commentDraft = '';
    }

    function deleteComment(commentId) {
        socket?.emit('client-deletes-comment', {
            commentId: Number(commentId)
        });
    }

    function goBack() {
        window.history.back();
    }
</script>

{#if loading}
    <p>Gathering recipes...</p>
{:else if !recipe}
    <p>Recipe does not exist.</p>
{:else}
    <article class="recipe-detail">
        <button class="back-btn" on:click={goBack}>
            {@html backIcon}
            Back
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
                    <button class="action-btn" class:active={liked} on:click={toggleLike}>
                    {@html liked ? heartFilledIcon : heartIcon}
                    <span class="action-label action-count">{likeCount}</span>
                </button>

                    <button class="action-btn" class:active={saved} on:click={toggleSaved}>
                        {@html saved ? bookmarkFilledIcon : bookmarkIcon}
                        <span class="action-label">{saved ? 'Saved' : 'Save'}</span>
                    </button>

                    <button class="cook-btn" on:click={() => cooking = true}>▶ Start Cooking</button>
                </div>
            </div>
            <div class="recipe-header-bottom">
                <div class="recipe-author">
                    <button class="author-link" on:click={() => navigate(`/users/${recipe.user_id}`)}>
                        <span class="author-avatar">
                            {#if recipe.author_avatar}
                                <img src={recipe.author_avatar} alt={recipe.author_name} />
                            {/if}
                        </span>
                        <span>{recipe.author_name}</span>
                    </button>

                    {#if !isOwnRecipe}
                        <button class="follow-btn" class:following on:click={toggleFollow}>
                            {following ? 'Following' : 'Follow'}
                        </button>
                    {/if}
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
                                    <span class="step-timer">{formatMinutes(step.timer_seconds)}</span>
                                {/if}
                            </p>
                        </li>
                    {/each}
                </ol>
            </section>
        </div>

        <section class="comments">
            <h2 class="recipe-subtitle">Comments</h2>

            <form class="comment-form" on:submit|preventDefault={sendComment}>
                <input class="field" bind:value={commentDraft} maxlength="500"
                    placeholder="Add a comment…" />
                <button class="cook-btn" type="submit">Post</button>
            </form>

            {#if comments.length === 0}
                <p class="profile-empty">No comments yet.</p>
            {:else}
                <ul class="comment-list">
                    {#each comments as comment (comment.id)}
                        <li class="comment">
                            <span class="cook-avatar">
                                {#if comment.author_avatar}
                                    <img src={comment.author_avatar} alt={comment.author_name} />
                                {/if}
                            </span>

                            <div class="comment-body">
                                <strong>{comment.author_name}</strong>
                                <p>{comment.text}</p>
                            </div>

                            {#if $user && $user.id === Number(comment.user_id)}
                                <button class="comment-delete"
                                        on:click={() => deleteComment(comment.id)}>Delete</button>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>
        {#if cooking}
            <CookingMode {recipe} on:close={() => cooking = false} />
        {/if}
    </article>
{/if}