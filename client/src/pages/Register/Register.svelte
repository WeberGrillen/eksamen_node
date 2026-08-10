<script>
    import { navigate } from 'svelte-routing';
    import { fetchPost } from '../../util/fetchUtil.js';
    import { toast } from 'svelte-sonner';

    export let mode = 'register';

    let name = '';
    let email = '';
    let password = '';

    let confirmPassword = '';
    let showPassword = false;

    let emailTouched = false;
    let emailValid = false;

    function validateEmail() {
        emailTouched = true;
        emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    async function handleRegister() {

        try {
        const result = await fetchPost('/api/auth/register', {
            name,
            email,
            password,
            confirmPassword
        });

        toast.success(result.data.successMessage);
        navigate('/login');

        } catch (error) {
            toast.error(error.data.errorMessage);
        }
    }
</script>

<main class="auth-page">
    <div class="auth-container">
         <aside class="auth-sidebar" class:register={mode === 'register'}>
            <div class="auth-sidebar-content">
                <h2 class="auth-sidebar-lable">WELCOME TO FOODIE</h2>
                <h1 class="auth-sidebar-title">Your kitchen, on the internet.</h1>
                <p class="auth-sidebar-description">Save recipes, follow your favorite cooks, and use Cooking Mode to make dinner easier.</p>
            </div>
        </aside>

        <section class="auth-card">
            <h1>Sign Up</h1>
            <p class="auth-card-description">Sign up to start cooking!</p>
            <form on:submit|preventDefault={handleRegister} class="auth-form">
                <div class="form-group">
                    <input class="auth-input-email" type="text" id="name" bind:value={name} placeholder="Name" />
                </div>
                <div class="form-group">
                    <input class="auth-input-email" type="email" id="email" bind:value={email} on:blur={validateEmail} class:invalid={emailTouched && !emailValid} placeholder="Email">
                    {#if emailTouched && !emailValid}
                        <p class="form-error">Please enter a valid email</p>
                    {/if}   
                </div>

                <div class="form-group">
                    <input class="auth-input-password" type="password" id="password" bind:value={password} placeholder="Password"/>
                
                </div>

                <div class="form-group">
                    <input class="auth-input-password" type="password" id="confirmPassword" bind:value={confirmPassword} placeholder="Confirm password" />
                </div>

                <button type="submit" class="auth-btn">Sign up</button>
        </form>
        <p class="auth-footer">Already have an account? <a href="/login">Sign in</a></p>
    </section>
    </div>
    
</main>