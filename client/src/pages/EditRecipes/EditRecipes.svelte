<script>
    import { onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';

    import { fetchGet, fetchPatch } from '../../util/fetchUtil.js';
    import { createEmptyRecipeForm, recipeToForm, formToRecipeData } from '../../util/recipeFormUtil.js';

    import RecipeForm from '../../components/RecipeForm/RecipeForm.svelte';

    export let id;

    let form = createEmptyRecipeForm();
    let loading = true;

    onMount(async () => {
        try {
            const result = await fetchGet(`/api/recipes/${id}`);

            form = recipeToForm(result.data.recipe);
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not load recipe');
        } finally {
            loading = false;
        }
    });

    async function handleSubmit() {
        const recipeData = formToRecipeData(form);

        try {
            const result = await fetchPatch(`/api/recipes/${id}`, recipeData);

            toast.success(result.data.successMessage);
            navigate(`/recipes/${id}`);
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not update recipe');
        }
    }
</script>

{#if loading}
    <p>Loading recipe...</p>
{:else}
    <RecipeForm
        bind:form
        title="Edit recipe"
        submitText="Save changes"
        on:submit={handleSubmit}
    />
{/if}