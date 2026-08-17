<script>
    import { onMount, onDestroy } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { fetchGet, fetchPatch, fetchDelete } from '../../util/fetchUtil';
    import { user } from '../../stores/userStore';
    import { BASE_URL } from '../../stores/generalStore';
    import io from 'socket.io-client';
    import RecipeCard from '../../components/RecipeCard/RecipeCard.svelte';

    export let id = null;

    let socket;
    let profile = null;
    let recipes = [];
    let saved = [];
    let liked = [];
    let counts = { followers: 0, following: 0 };
    let loading = true;

    let activeTab = 'recipes';
    let editingBio = false;
    let bioDraft = '';
    let following = false;

    const tabs = [
        { id: 'recipes', label: 'Recipes' },
        { id: 'saved', label: 'Saved' },
        { id: 'liked', label: 'Liked' }
    ];

    $: profileId = id ?? $user?.id;
    $: isOwnProfile = profile && $user && Number(profile.id) == Number($user.id);

    $: visible = activeTab === 'recipes' ? recipes : activeTab === 'saved' ? saved : liked;
    

    let lastLoadedId = null;

    $: if (profileId && profileId !== lastLoadedId) {
        lastLoadedId = profileId;
        loading = true;
        load();
    }

    async function load() {
        try {
            const result = await fetchGet(`/api/users/${profileId}/profile`);
            profile = result.data.profile;
            recipes = result.data.recipes;
            saved = result.data.saved;
            liked = result.data.liked;
            counts = result.data.counts;
            following = !!profile.is_following;
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not load profile');
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        socket = io($BASE_URL, { withCredentials: true });

        socket.on('server-sends-follower-count', (data) => {
            if (Number(data.userId) === Number(profileId)) counts.followers = data.count;
        });

        socket.on('server-sends-follow-state', (data) => {
            if (Number(data.userId) === Number(profileId)) following = data.following;
        });
    });

    onDestroy(() => socket?.disconnect());

    function toggleFollow() {
        socket?.emit('client-toggles-follow', { userId: Number(profileId) });
    }

    function pickImage(event, field) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => save({ [field]: reader.result });
        reader.readAsDataURL(file);
    }

    function startEditBio() {
        bioDraft = profile.bio ?? '';
        editingBio = true;
    }

    async function saveBio() {
        editingBio = false;
        await save({ bio: bioDraft });
    }

    async function save(body) {
        try {
            await fetchPatch('/api/users/me', body);
            await load();
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not update profile');
        }
    }

    async function handleDelete(event) {
        const recipeId = event.detail;

        try {
            await fetchDelete(`/api/recipes/${recipeId}`);
            recipes = recipes.filter((r) => r.id !== recipeId);
            saved = saved.filter((r) => r.id !== recipeId);
            liked = liked.filter((r) => r.id !== recipeId);
            toast.success('Recipe deleted');
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not delete recipe');
        }
    }
</script>

{#if loading}
    <p class="profile-loading">Loading profile...</p>
{:else if !profile}
    <p class="profile-loading">Profile not found.</p>
{:else}
    <div class="profile-page">
        <label class="profile-banner" class:readonly={!isOwnProfile}>
            {#if profile.banner_data}
                <img src={profile.banner_data} alt="" />
            {/if}
            {#if isOwnProfile}
            <span class="upload-hint">Change banner</span>
            <input type="file" accept="image/*" on:change={(e) => pickImage(e, 'bannerData')} />
            {/if}
        </label>

        <label class="profile-avatar" class:readonly={!isOwnProfile}>
            {#if profile.avatar_data}
                <img src={profile.avatar_data} alt={profile.name} />
            {/if}
            {#if isOwnProfile}
            <span class="upload-hint">Change</span>
            <input type="file" accept="image/*" on:change={(e) => pickImage(e, 'avatarData')} />
            {/if}
        </label>

        <div class="profile-header">
            <div class="profile-header-text">
                <h1 class="profile-name">{profile.name}</h1>

                {#if isOwnProfile && editingBio}
                    <div class="profile-bio-edit">
                        <input class="field" bind:value={bioDraft} maxlength="300"
                            placeholder="Tell people what you cook" />
                        <button class="recipe-button" on:click={saveBio}>Save</button>
                        <button class="recipe-button" on:click={() => editingBio = false}>Cancel</button>
                    </div>
                {:else}
                    <p class="profile-bio">
                        {profile.bio || 'No bio yet.'}
                        {#if isOwnProfile}
                            <button class="profile-bio-btn" on:click={startEditBio}>Edit</button>
                        {/if}
                    </p>
                {/if}
            </div>

            {#if !isOwnProfile}
                <button class="follow-btn" class:following on:click={toggleFollow}>
                    {following ? 'Following' : 'Follow'}
                </button>
            {/if}
        </div>

        <div class="profile-stats">
            <span><strong>{recipes.length}</strong> Recipes</span>
            <span><strong>{counts.followers}</strong> Followers</span>
            <span><strong>{counts.following}</strong> Following</span>
        </div>

        <div class="profile-tabs">
            {#each tabs as tab}
                <button
                    class="profile-tab"
                    class:active={activeTab === tab.id}
                    on:click={() => activeTab = tab.id}
                >
                    {tab.label}
                </button>
            {/each}
        </div>

        {#if visible.length === 0}
            <p class="profile-empty">Nothing here yet.</p>
        {:else}
            <div class="recipe-grid">
                {#each visible as recipe (recipe.id)}
                    <RecipeCard
                        {recipe}
                        showMenu={isOwnProfile && activeTab === 'recipes'}
                        on:delete={handleDelete}
                    />
                {/each}
            </div>
        {/if}
    </div>
{/if}