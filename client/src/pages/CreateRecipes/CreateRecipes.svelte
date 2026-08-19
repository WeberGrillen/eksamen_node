<script>
    import { navigate } from 'svelte-routing';
    import { fetchPost } from '../../util/fetchUtil.js';
    import { toast } from 'svelte-sonner';

    import closeIcon from '../../assets/x.svg?raw';
    import imageIcon from '../../assets/image.svg?raw';

    function goBack() {
        window.history.back();
    }

    let title = '';
    let description = '';
    let category = '';
    let totalMinutes = '';
    let servings = '';
    let difficulty = '';
    let imageData = '';

    let ingredients = [''];
    let steps = [{ text: '', minutes: '' }];

    function addIngredient() {
        ingredients = [...ingredients, ''];
    }

    function removeIngredient(index) {
        ingredients = ingredients.filter((_, i) => i !== index);
    }

    function addStep() {
        steps = [...steps, {text: '', minutes: ''}];
    }

    function removeStep(index) {
        steps = steps.filter((_, i) => i !== index);
    }

    function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const MAX = 1200;
                const scale = Math.min(1, MAX / Math.max(img.width, img.height));

                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const context = canvas.getContext('2d');
                context.drawImage(img, 0, 0, canvas.width, canvas.height);

                imageData = canvas.toDataURL('image/jpeg', 0.8)
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    }

    async function handleSubmit() {
        const cleanIngredients = ingredients
            .map((text) => text.trim())
            .filter((text) => text !== '');

        const cleanSteps = steps
            .filter((step) => step.text.trim() !== '')
            .map((step) => ({
                text: step.text.trim(),
                timerSeconds: step.minutes === '' ? null : Number(step.minutes) * 60
            }));

        try {
            const result = await fetchPost('/api/recipes', {
                title: title.trim(),
                description: description.trim() || null,
                category: category || null,
                difficulty: difficulty || null,
                totalMinutes: totalMinutes === '' ? null : Number(totalMinutes),
                servings: servings === '' ? null : Number(servings),
                imageData: imageData || null,
                ingredients: cleanIngredients,
                steps: cleanSteps
            });

            toast.success(result.data.successMessage)
            navigate('/home');
        } catch (error) {
            toast.error(error?.data?.errorMessage ?? 'Could not create recipe');
        }
    }
</script>

<main class="recipe-page">
    <div class="recipe-modal">
    <button class="close-btn" type="button" on:click={goBack} aria-label="Close">
      {@html closeIcon}
    </button>

    <h2 class="modal-title">New recipe</h2>

    <form class="create-recipe-form" on:submit|preventDefault={handleSubmit}>
        <input class="field" type="text" bind:value={title} placeholder="Recipe title" />

        <textarea class="field field-textarea" bind:value={description}
            placeholder="Description — what makes this one worth cooking?"></textarea>

        <label class="photo-drop">
            {#if imageData}
                <img src={imageData} alt="" class="photo-preview" />
            {:else}
                {@html imageIcon}
                <span class="photo-drop-title">Add a photo</span>
                <span class="photo-drop-hint">PNG or JPG, up to 5 MB</span>
            {/if}
            <input type="file" accept="image/*" on:change={handleFile} />
        </label>

        <div class="field-grid">
            <select class="field field-select" bind:value={category}>
                <option value="" disabled>Category…</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Dessert">Dessert</option>
                <option value="Snack">Snack</option>
                <option value="Drinks">Drinks</option>
            </select>

            <select class="field field-select" bind:value={difficulty}>
                <option value="" disabled>Difficulty…</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
            </select>

            <input class="field" type="number" min="0" bind:value={totalMinutes} placeholder="Total minutes" />
            <input class="field" type="number" min="1" bind:value={servings} placeholder="Servings" />
        </div>

        <fieldset class="recipe-section">
            <legend class="create-recipe-subtitle">Ingredients</legend>
            {#each ingredients as ingredient, index}
                <div class="list-row">
                    <input class="field" type="text" bind:value={ingredients[index]}
                        placeholder="e.g. 2 cups flour" />
                    {#if ingredients.length > 1}
                        <button class="remove-button" type="button"
                            on:click={() => removeIngredient(index)} aria-label="Remove ingredient">×</button>
                    {/if}
                </div>
            {/each}
            <button class="recipe-button" type="button" on:click={addIngredient}>+ Add ingredient</button>
        </fieldset>

        <fieldset class="recipe-section">
            <legend class="create-recipe-subtitle">Steps</legend>
            {#each steps as step, index}
                <div class="list-row">
                    <input class="field" type="text" bind:value={steps[index].text}
                        placeholder="Describe this step" />
                    <input class="field step-timer" type="number" min="0"
                        bind:value={steps[index].minutes} placeholder="min" />
                    {#if steps.length > 1}
                        <button class="remove-button" type="button"
                            on:click={() => removeStep(index)} aria-label="Remove step">×</button>
                    {/if}
                </div>
            {/each}
            <button class="recipe-button" type="button" on:click={addStep}>+ Add step</button>
        </fieldset>

      <button class="submit-button" type="submit">Publish recipe</button>
    </form>
  </div>
</main>