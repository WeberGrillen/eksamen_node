<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';
    import { user } from '../../stores/userStore.js';
    import { getSocket } from '../../stores/socket.js'
    import { fetchPost, fetchDelete } from '../../util/fetchUtil.js';
    import heartIcon from '../../assets/heart.svg?raw';
    import heartFilledIcon from '../../assets/heart-fill.svg?raw';
    import bookmarkIcon from '../../assets/bookmark.svg?raw';
    import bookmarkFilledIcon from '../../assets/bookmark-fill.svg?raw';
    import ellipsisIcon from '../../assets/ellipsis-vertical.svg?raw';
    

    import editIcon from '../../assets/pencil.svg?raw';
    import trashIcon from '../../assets/trash-2.svg?raw';

    export let recipe;
    export let showMenu = false;

    const dispatch = createEventDispatcher();
    const socket = getSocket();

    let menuOpen = false;
    let likeCount = recipe.like_count ?? 0;
    let liked = !!recipe.is_liked;
    let saved = !!recipe.is_saved;

    $: isOwner = Boolean(
        $user &&
        Number($user.id) === Number(recipe.user_id)
    );

    function onLikeCount(data) {
        if (Number(data.recipeId) === Number(recipe.id)) {
            likeCount = data.count;
        }
    }

    function onLikeState(data) {
        if (Number(data.recipeId) === Number(recipe.id)) {
            liked = data.liked;
        }
    }

    onMount(() => {
        socket.on('server-sends-like-count', onLikeCount);
        socket.on('server-sends-like-state', onLikeState);
    });

    onDestroy(() => {
        socket.off('server-sends-like-count', onLikeCount);
        socket.off('server-sends-like-state', onLikeState);
    });

    function toggleLike(event) {
        event.stopPropagation();
        socket.emit('client-toggles-like', { recipeId: Number(recipe.id) });
    }

    async function toggleSave(event) {
        event.stopPropagation();

        const wasSaved = saved;
        saved = !wasSaved;

        try {
            if (wasSaved) {
                await fetchDelete(`/api/recipes/${recipe.id}/save`);
            } else {
                await fetchPost(`/api/recipes/${recipe.id}/save`);
            }
        } catch (error) {
            saved = wasSaved;
            toast.error(error?.data?.errorMessage);
        }
    }

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

        <div class="card-actions">
            <button class="action-btn" class:active={liked} on:click={toggleLike}>
                {@html liked ? heartFilledIcon : heartIcon}
                <span class="card-action-count">{likeCount}</span>
            </button>

            <button class="action-btn" class:active={saved} on:click={toggleSave}
                aria-label="Save recipe">
                {@html saved ? bookmarkFilledIcon : bookmarkIcon}
            </button>
        </div>
        

        {#if showMenu && isOwner}
            <div class="card-menu">
                <button class="card-menu-btn" on:click={toggleMenu} aria-label="Options">
                    {@html ellipsisIcon}
                </button>

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