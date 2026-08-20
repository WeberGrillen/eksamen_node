<script>
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';

    import { fetchPost } from '../../util/fetchUtil.js';
    import { createEmptyRecipeForm, formToRecipeData } from '../../util/recipeFormUtil.js';

    import RecipeForm from '../../components/RecipeForm/RecipeForm.svelte';

    let form = createEmptyRecipeForm();

    async function handleSubmit() {
        const recipeData = formToRecipeData(form);

        try {
            const result = await fetchPost('/api/recipes', recipeData);

            toast.success(result.data.successMessage);
            navigate('/profile');
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not create recipe');
        }
    }
</script>

<RecipeForm
    bind:form
    title="New recipe"
    submitText="Publish recipe"
    on:submit={handleSubmit}
/>