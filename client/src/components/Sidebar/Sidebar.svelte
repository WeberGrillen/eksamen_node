<script>
    import homeIcon from '../../assets/home.svg?raw';
    import DiscoverIcon from '../../assets/compass.svg?raw';
    import savedIcon from '../../assets/bookmark.svg?raw';
    import profileIcon from '../../assets/user.svg?raw';
    import plusIcon from '../../assets/plus.svg?raw';
    import xIcon from '../../assets/x.svg?raw';

    import { Router, Link, navigate, link } from "svelte-routing";
    import { toast } from "svelte-sonner";
    import { fetchPost } from "../../util/fetchUtil";
    import { user } from "../../stores/userStore";

    async function logout() {

        try {
            const result = await fetchPost('/api/auth/logout');
            user.set(null);
            toast.success(result.data.successMessage);
            navigate('/');

        } catch (error) {
            toast.error(error.data.errorMessage);
        }
    };

    let showLoginModal = false;
</script>


<nav class="sidebar">
<Link to="/" class="sidebar-brand">Foodie</Link>

    <button class="sidebar-btn" on:click={() => navigate ('/')}>
        {@html homeIcon}
        Home
    </button>

    <button class="sidebar-btn" on:click={() => navigate ('/discover')}>
        {@html DiscoverIcon}
        Discover
    </button>

    <button class="sidebar-btn" on:click={() => navigate ('/saved')}>
        {@html savedIcon}
        Saved
    </button>

    <button class="sidebar-btn" on:click={() => navigate ('/profile')}>
        {@html profileIcon}
        Profile
    </button>

    <button class="sidebar-create-btn">
        {@html plusIcon}
        New Recipe
    </button>

    {#if $user}
    <button class="signout-btn" on:click={logout}>Logout</button>
    {:else}
    <div class="register-container">
    <span class="register-title">Join Foodie</span>
    <span class="register-description">Save recipes, follow cooks or create your own food blog</span>
    <button class="register-btn" on:click={() => navigate('/register')}>
        Create Account
    </button>
    <button class="signin-btn" on:click={() => navigate('/login')}>
        <span>Already have an account?</span>
        <span>Sign in</span>
    </button>
    </div>
    {/if}

</nav>
