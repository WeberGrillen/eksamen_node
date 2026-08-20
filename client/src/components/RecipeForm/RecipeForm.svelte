<script>
    import { createEventDispatcher } from 'svelte';
    import { toast } from 'svelte-sonner';

    import { CATEGORIES, DIFFICULTIES } from '../../util/categoryUtil.js';
    import { resizeImage } from '../../util/imageUtil.js';

    import closeIcon from '../../assets/x.svg?raw';
    import imageIcon from '../../assets/image.svg?raw';

    export let form;
    export let title;
    export let submitText;

    const dispatch = createEventDispatcher();

    function goBack() {
        window.history.back();
    }

    function addIngredient() {
        form.ingredients = [...form.ingredients, ''];
        form = form;
    }

    function removeIngredient(index) {
        form.ingredients = form.ingredients.filter((_, i) => i !== index);
        form = form;
    }

    function addStep() {
        form.steps = [...form.steps, { text: '', minutes: '' }];
        form = form;
    }

    function removeStep(index) {
        form.steps = form.steps.filter((_, i) => i !== index);
        form = form;
    }

    async function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            form.imageData = await resizeImage(file);
            form = form;
        } catch (error) {
            toast.error(error.message);
        }
    }

    function handleSubmit() {
        dispatch('submit');
    }
</script>

<main class="recipe-page">
    <div class="recipe-modal">
        <button class="close-btn" type="button" on:click={goBack} aria-label="Close">
            {@html closeIcon}
        </button>

        <h2 class="modal-title">{title}</h2>

        <form class="create-recipe-form" on:submit|preventDefault={handleSubmit}>
            <input class="field" type="text" bind:value={form.title} placeholder="Recipe title" />

            <textarea class="field field-textarea" bind:value={form.description}
                placeholder="Description — what makes this one worth cooking?"></textarea>

            <label class="photo-drop">
                {#if form.imageData}
                    <img src={form.imageData} alt="" class="photo-preview" />
                {:else}
                    {@html imageIcon}
                    <span class="photo-drop-title">Add a photo</span>
                    <span class="photo-drop-hint">PNG or JPG, up to 5 MB</span>
                {/if}

                <input type="file" accept="image/*" on:change={handleFile} />
            </label>

            <div class="field-grid">
                <select class="field field-select" bind:value={form.category}>
                    <option value="" disabled>Category…</option>

                    {#each CATEGORIES as categoryOption}
                        <option value={categoryOption}>
                            {categoryOption}
                        </option>
                    {/each}
                </select>

                <select class="field field-select" bind:value={form.difficulty}>
                    <option value="" disabled>Difficulty…</option>

                    {#each DIFFICULTIES as difficultyOption}
                        <option value={difficultyOption}>
                            {difficultyOption}
                        </option>
                    {/each}
                </select>

                <input class="field" type="number" min="0"
                    bind:value={form.totalMinutes} placeholder="Total minutes" />

                <input class="field" type="number" min="1"
                    bind:value={form.servings} placeholder="Servings" />
            </div>

            <fieldset class="recipe-section">
                <legend class="create-recipe-subtitle">Ingredients</legend>

                {#each form.ingredients as ingredient, index}
                    <div class="list-row">
                        <input class="field" type="text" bind:value={form.ingredients[index]}
                            placeholder="e.g. 2 cups flour" />

                        {#if form.ingredients.length > 1}
                            <button class="remove-button" type="button"
                                on:click={() => removeIngredient(index)}
                                aria-label="Remove ingredient">×</button>
                        {/if}
                    </div>
                {/each}

                <button class="recipe-button" type="button" on:click={addIngredient}>
                    + Add ingredient
                </button>
            </fieldset>

            <fieldset class="recipe-section">
                <legend class="create-recipe-subtitle">Steps</legend>

                {#each form.steps as step, index}
                    <div class="list-row">
                        <input class="field" type="text" bind:value={form.steps[index].text}
                            placeholder="Describe this step" />

                        <input class="field step-timer" type="number" min="0"
                            bind:value={form.steps[index].minutes} placeholder="min" />

                        {#if form.steps.length > 1}
                            <button class="remove-button" type="button"
                                on:click={() => removeStep(index)}
                                aria-label="Remove step">×</button>
                        {/if}
                    </div>
                {/each}

                <button class="recipe-button" type="button" on:click={addStep}>
                    + Add step
                </button>
            </fieldset>

            <button class="submit-button" type="submit">{submitText}</button>
        </form>
    </div>
</main>