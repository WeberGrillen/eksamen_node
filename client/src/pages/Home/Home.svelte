<script>
    import { onMount, onDestroy } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';

    import { fetchGet, fetchPost, fetchDelete } from '../../util/fetchUtil.js';
    import { getSocket } from '../../stores/socket.js';
    import { CATEGORY_FILTERS } from '../../util/categoryUtil.js';

    import RecipeCard from '../../components/RecipeCard/RecipeCard.svelte';

    import heartIcon from '../../assets/heart.svg?raw';
    import heartFilledIcon from '../../assets/heart-fill.svg?raw';
    import bookmarkIcon from '../../assets/bookmark.svg?raw';
    import bookmarkFilledIcon from '../../assets/bookmark-fill.svg?raw';

    const socket = getSocket();

    let forYou = [];
    let following = [];
    let cooks = [];
    let trending = [];

    let feed = 'forYou';
    let activeTag = 'All';
    let loading = true;

    $: source = feed === 'forYou'
        ? forYou
        : following;

    $: filtered = source.filter((recipe) =>
        activeTag === 'All' ||
        recipe.category?.toLowerCase() === activeTag.toLowerCase()
    );

    $: featured = filtered[0];
    $: rest = filtered.slice(1);

    $: greeting = getGreeting();

    function getGreeting() {
        const hour = new Date().getHours();

        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';

        return 'Good evening';
    }

    function onLikeCount(data) {
        const updateRecipes = (recipes) =>
            recipes.map((recipe) =>
                Number(recipe.id) === Number(data.recipeId)
                    ? { ...recipe, like_count: data.count }
                    : recipe
            );

        forYou = updateRecipes(forYou);
        following = updateRecipes(following);
        trending = updateRecipes(trending);
    }

    function onFollowState(data) {
        cooks = cooks.map((person) =>
            Number(person.id) === Number(data.userId)
                ? { ...person, is_following: data.following }
                : person
        );
    }

    onMount(async () => {
        try {
            const [
                recipesResult,
                followingResult,
                usersResult,
                trendingResult
            ] = await Promise.all([
                fetchGet('/api/recipes'),
                fetchGet('/api/recipes/following'),
                fetchGet('/api/users'),
                fetchGet('/api/recipes/trending')
            ]);

            forYou = recipesResult.data.recipes
                .sort((a, b) =>
                    Number(b.like_count) - Number(a.like_count)
                );
            following = followingResult.data.recipes
                .sort((a, b) =>
                    Number(b.like_count) - Number(a.like_count)
                );

            cooks = usersResult.data.users
                .filter((person) => !person.is_following);

            trending = trendingResult.data.recipes;

        } catch (error) {
            toast.error(error?.data?.errorMessage);
        } finally {
            loading = false;
        }

        socket.on('server-sends-like-count', onLikeCount);
        socket.on('server-sends-follow-state', onFollowState);
    });

    onDestroy(() => {
        socket.off('server-sends-like-count', onLikeCount);
        socket.off('server-sends-follow-state', onFollowState);
    });

    function toggleFollow(event, person) {
        event.stopPropagation();

        socket.emit('client-toggles-follow', {
            userId: Number(person.id)
        });
    }

    function toggleFeaturedLike(event) {
        event.stopPropagation();

        socket.emit('client-toggles-like', {
            recipeId: Number(featured.id)
        });
    }

    async function toggleFeaturedSave(event) {
        event.stopPropagation();

        const wasSaved = !!featured.is_saved;

        updateFeatured({
            is_saved: !wasSaved
        });

        try {
            if (wasSaved) {
                await fetchDelete(`/api/recipes/${featured.id}/save`);
            } else {
                await fetchPost(`/api/recipes/${featured.id}/save`);
            }

        } catch (error) {
            updateFeatured({
                is_saved: wasSaved
            });

            toast.error(error?.data?.errorMessage);
        }
    }

    function updateFeatured(changes) {
        const updateRecipes = (recipes) =>
            recipes.map((recipe) =>
                Number(recipe.id) === Number(featured.id)
                    ? { ...recipe, ...changes }
                    : recipe
            );

        forYou = updateRecipes(forYou);
        following = updateRecipes(following);
    }
</script>

<div class="home-page">
    <main class="home-main">
        <div class="home-header">
            <h1 class="home-greeting">{greeting}</h1>

            <div class="feed-toggle">
                <button
                    class:active={feed === 'forYou'}
                    on:click={() => feed = 'forYou'}
                >
                    For You
                </button>

                <button
                    class:active={feed === 'following'}
                    on:click={() => feed = 'following'}
                >
                    Following
                </button>
            </div>
        </div>

        <div class="discover-tags">
            {#each CATEGORY_FILTERS as tag}
                <button
                    class="discover-tags-btn"
                    class:active={activeTag === tag}
                    on:click={() => activeTag = tag}
                >
                    {tag}
                </button>
            {/each}
        </div>

        {#if loading}
            <p class="profile-empty">Loading your feed...</p>

        {:else if filtered.length === 0}
            <p class="profile-empty">
                {feed === 'following'
                    ? "You're not following anyone with recipes yet."
                    : 'Nothing here yet.'}
            </p>

        {:else}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <article
                class="featured-card"
                on:click={() => navigate(`/recipes/${featured.id}`)}
            >
                <div class="featured-img">
                    {#if featured.image_data}
                        <img src={featured.image_data} alt={featured.title} />
                    {:else}
                        <span>photo · {featured.title}</span>
                    {/if}
                </div>

                <div class="featured-body">
                    <span class="featured-label">Featured</span>

                    <h2>{featured.title}</h2>

                    <p class="featured-meta">
                        by {featured.author_name}
                        · {featured.total_minutes} min
                        · {featured.difficulty}
                    </p>

                    <div class="card-actions">
                        <button
                            class="card-action"
                            class:active={featured.is_liked}
                            on:click={toggleFeaturedLike}
                        >
                            {@html featured.is_liked ? heartFilledIcon : heartIcon}
                            <span class="card-action-count">
                                {featured.like_count}
                            </span>
                        </button>

                        <button
                            class="card-action"
                            class:active={featured.is_saved}
                            on:click={toggleFeaturedSave}
                        >
                            {@html featured.is_saved ? bookmarkFilledIcon : bookmarkIcon}
                            {featured.is_saved ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </article>

            <div class="recipe-grid">
                {#each rest as recipe (recipe.id)}
                    <RecipeCard {recipe} />
                {/each}
            </div>
        {/if}
    </main>

    <aside class="home-aside">
        {#if cooks.length > 0}
            <h2 class="discover-section-title">Cooks to follow</h2>

            <ul class="cook-list">
                {#each cooks as person (person.id)}
                    <li>
                        <button
                            class="cook-row"
                            on:click={() => navigate(`/users/${person.id}`)}
                        >
                            <span class="cook-avatar">
                                {#if person.avatar_data}
                                    <img src={person.avatar_data} alt={person.name} />
                                {/if}
                            </span>

                            <span class="cook-info">
                                <strong>{person.name}</strong>

                                {#if person.bio}
                                    <span class="user-meta">
                                        {person.bio}
                                    </span>
                                {/if}
                            </span>

                            <span
                                class="follow-btn"
                                class:following={person.is_following}
                                role="button"
                                tabindex="0"
                                on:click={(event) => toggleFollow(event, person)}
                                on:keydown={(event) =>
                                    event.key === 'Enter' &&
                                    toggleFollow(event, person)
                                }
                            >
                                {person.is_following ? 'Following' : 'Follow'}
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}

        {#if trending.length > 0}
            <h2 class="discover-section-title">Trending</h2>

            <ul class="trending-list">
                {#each trending as recipe (recipe.id)}
                    <li>
                        <button
                            class="trending-row"
                            on:click={() => navigate(`/recipes/${recipe.id}`)}
                        >
                            <span class="trending-thumb">
                                {#if recipe.image_data}
                                    <img src={recipe.image_data} alt={recipe.title} />
                                {/if}
                            </span>

                            <span class="trending-info">
                                <strong>{recipe.title}</strong>

                                <span class="user-meta">
                                    {recipe.like_count} likes
                                </span>
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </aside>
</div>