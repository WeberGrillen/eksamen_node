<script>
    import { onMount, onDestroy } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';
    import { fetchGet } from '../../util/fetchUtil';
    import { BASE_URL } from '../../stores/generalStore';
    import io from 'socket.io-client';
    import searchIcon from '../../assets/search.svg?raw';
    import RecipeCard from '../../components/RecipeCard/RecipeCard.svelte';
    

    let socket;
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
            toast.error(error?.data?.errorMessage ?? 'Could not load recipes');
        }

        try {
            const result = await fetchGet('/api/users');
            users = result.data.users;
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not load profiles');
        }

        loading = false;

        socket = io($BASE_URL, {
            withCredentials: true
        });

        socket.on("server-sends-follower-count", (data) => {
            users = users.map((u) =>
                u.id === Number(data.userId) ? { ...u, follower_count: data.count } : u
            );
        });

        socket.on("server-sends-follow-state", (data) => {
            users = users.map((u) =>
                u.id === Number(data.userId) ? { ...u, is_following: data.following } : u
            );
        });
    });

    onDestroy(() => socket?.disconnect());

    function toggleFollow(event, person) {
        event.stopPropagation();
        socket?.emit("client-toggles-follow", { userId: person.id });
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