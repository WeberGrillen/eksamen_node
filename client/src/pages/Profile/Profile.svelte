<script>
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { fetchGet, fetchPatch, fetchDelete } from '../../util/fetchUtil';
    import { user } from '../../stores/userStore';
    import RecipeCard from '../../components/RecipeCard/RecipeCard.svelte';

    let profile = null;
    let recipes = [];
    let saved = [];
    let liked = [];
    let counts = { followers: 0, following: 0 };
    let loading = true;

    let activeTab = 'recipes';
    let editingBio = false;
    let bioDraft = '';

    const tabs = [
        { id: 'recipes', label: 'Recipes' },
        { id: 'saved', label: 'Saved' },
        { id: 'liked', label: 'Liked' }
    ];

    $: visible = activeTab === 'recipes' ? recipes
               : activeTab === 'saved' ? saved
               : liked;

    onMount(load);

    async function load() {
        try {
            const result = await fetchGet(`/api/users/${$user.id}/profile`);
            profile = result.data.profile;
            recipes = result.data.recipes;
            saved = result.data.saved;
            liked = result.data.liked;
            counts = result.data.counts;
        } catch (error) {
            toast.error(error.data.errorMessage);
        } finally {
            loading = false;
        }
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
            toast.error(error.data.errorMessage);
        }
    }

    async function handleDelete(event) {
        const id = event.detail;

        try {
            await fetchDelete(`/api/recipes/${id}`);
            recipes = recipes.filter((r) => r.id !== id);
            toast.success('Recipe deleted');
        } catch (error) {
            toast.error(error.data.errorMessage);
        }
    }
</script>

{#if loading}
    <p class="profile-loading">Loading profile...</p>
{:else if !profile}
    <p class="profile-loading">Profile not found.</p>
{:else}
    <div class="profile-page">
        <label class="profile-banner">
            {#if profile.banner_data}
                <img src={profile.banner_data} alt="" />
            {/if}
            <span class="upload-hint">Change banner</span>
            <input type="file" accept="image/*" on:change={(e) => pickImage(e, 'bannerData')} />
        </label>

        <label class="profile-avatar">
            {#if profile.avatar_data}
                <img src={profile.avatar_data} alt={profile.name} />
            {/if}
            <span class="upload-hint">Change</span>
            <input type="file" accept="image/*" on:change={(e) => pickImage(e, 'avatarData')} />
        </label>

        <h1 class="profile-name">{profile.name}</h1>

        {#if editingBio}
            <div class="profile-bio-edit">
                <input class="field" bind:value={bioDraft} maxlength="300"
                       placeholder="Tell people what you cook" />
                <button class="recipe-button" on:click={saveBio}>Save</button>
                <button class="recipe-button" on:click={() => editingBio = false}>Cancel</button>
            </div>
        {:else}
            <p class="profile-bio">
                {profile.bio ?? 'No bio yet.'}
                <button class="profile-bio-btn" on:click={startEditBio}>Edit</button>
            </p>
        {/if}

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
                        showMenu={activeTab === 'recipes'}
                        on:delete={handleDelete}
                    />
                {/each}
            </div>
        {/if}
    </div>
{/if}