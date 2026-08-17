<script>
    import { onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { fetchGet, fetchPost, fetchDelete } from '../../util/fetchUtil';
    import Navbar from '../../components/Sidebar/Sidebar.svelte';
    import searchIcon from '../../assets/search.svg?raw';
    import RecipeCard from '../../components/RecipeCard/RecipeCard.svelte';
    import { toast } from 'svelte-sonner';

    let recipes = [];
    let users = [];
    let query = '';
    let activeTag = 'All';
    let loading = true;

    const tags = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drinks'];

    $: filteredRecipe = recipes.filter((r) =>
        (activeTag === 'All' || r.category?.toLowerCase() === activeTag.toLowerCase()) &&
        r.title.toLowerCase().includes(query.toLowerCase())
    );

    $: filteredUsers = query.trim() === ''
        ? []
        : users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));

    onMount(async () => {
        try {
            const result = await fetchGet('/api/recipes');
            recipes = result.data.recipes;
        } catch (error) {
            console.log(error);
            toast.error(error?.data?.errorMessage ?? 'Could not load recipes');
        }

        try {
            const result = await fetchGet('/api/users');
            users = result.data.users;
        } catch (error) {
            console.log(error);
            toast.error(error?.data?.errorMessage ?? 'Could not load profiles');
        }

        loading = false;
    });

    async function toggleFollow(event, person) {
        event.stopPropagation();

        const wasFollowing = person.is_following;

        users = users.map((u) =>
            u.id === person.id
                ? { ...u, is_following: !wasFollowing,
                    follower_count: u.follower_count + (wasFollowing ? -1 : 1) }
                : u
        );

        try {
            if (wasFollowing) {
                await fetchDelete(`/api/users/${person.id}/follow`);
            } else {
                await fetchPost(`/api/users/${person.id}/follow`);
            }
        } catch (error) {
            users = users.map((u) =>
                u.id === person.id
                    ? { ...u, is_following: wasFollowing,
                        follower_count: u.follower_count + (wasFollowing ? 1 : -1) }
                    : u
            );
            toast.error(error.data.errorMessage);
        }
    }

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

    {#if filteredUsers.length > 0}
        <h2 class="discover-section-title">Profiles</h2>

        <div class="user-grid">
            {#each filteredUsers as person (person.id)}
                <button class="user-row" on:click={() => navigate(`/users/${person.id}`)}>
                    <span class="user-avatar">
                        {#if person.avatar_data}
                            <img src={person.avatar_data} alt={person.name} />
                        {/if}
                    </span>

                    <span class="user-info">
                        <strong>{person.name}</strong>
                        <span class="user-meta">
                            {#if person.bio}{person.bio} · {/if}{person.recipe_count} recipes
                        </span>
                    </span>

                    <span
                        class="follow-btn"
                        class:following={person.is_following}
                        role="button"
                        tabindex="0"
                        on:click={(e) => toggleFollow(e, person)}
                        on:keydown={(e) => e.key === 'Enter' && toggleFollow(e, person)}
                    >
                        {person.is_following ? 'Following' : 'Follow'}
                    </span>
                </button>
            {/each}
        </div>
    {/if}

    <h2 class="discover-section-title">Recipes</h2>
    <div class="recipe-grid">
        {#each filteredRecipe as recipe (recipe.id)}
            <RecipeCard {recipe} />
        {/each}
    </div>
</div>