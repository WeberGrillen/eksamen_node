<script>
    import { navigate } from 'svelte-routing';
    import { checkAuth } from '../../stores/userStore.js';
    import { fetchPost } from '../../util/fetchUtil.js';
    import { toast } from 'svelte-sonner';



    let email = '';
    let password = '';

    let emailTouched = false;
    let emailValid = false;

    function validateEmail() {
        emailTouched = true;
        emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    async function handleLogin() {

        try {
        const result = await fetchPost("/api/auth/login", {
            email,
            password
        });
        await checkAuth();
        toast.success(result.data.successMessage);
        navigate('/home');
        } catch (error) {
            toast.error(error.data.errorMessage);
        }   
    }

</script>



<main class="auth-page">
    <div class="auth-container">
        <aside class="auth-sidebar">
            <div class="auth-sidebar-content">
                <h2 class="auth-sidebar-lable">WELCOME TO FOODIE</h2>
                <h1 class="auth-sidebar-title">Your kitchen, on the internet.</h1>
                <p class="auth-sidebar-description">Save recipes, follow your favorite cooks, and use Cooking Mode to make dinner easier.</p>
            </div>
        </aside>

    <section class="auth-card">
        <h1>Welcome back</h1>
        <p class="auth-card-description">Sign in to continue cooking</p>
        <form on:submit|preventDefault={handleLogin} class="auth-form">
            <div class="form-group">
                <input class="auth-input-email" type="email" id="email" bind:value={email} on:blur={validateEmail} class:invalid={emailTouched && !emailValid} placeholder="Email">
                {#if emailTouched && !emailValid}
                    <p class="form-error">Please enter a valid email</p>
                {/if}   
            </div>
            <div class="form-group">
                <input class="auth-input-password" type="password" id="password" bind:value={password} placeholder="Password">
            </div>
            <button type="submit" class="auth-btn">Sign in</button>
        </form>
        <p class="auth-footer">Don't have an account? <a href="/register">Sign up</a></p>
    </section>
    </div>
    
</main>
