<script>
    import { navigate } from 'svelte-routing';
    import { fetchPost } from '../../util/fetchUtil.js';
    import { toast } from 'svelte-sonner';

    import backIcon from '../../assets/arrow-left.svg?raw'

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
    <div class="recipe-container">
        <header class="recipe-header">
            <button class="back-btn" on:click={goBack}>
                {@html backIcon}
                Back
            </button>
            <div class="recipe-header-title">
                <span>NEW RECIPE</span>
                <h2>Tell us what you're cooking</h2>
            </div>
        </header>
        
        <form class="create-recipe-form" on:submit|preventDefault={handleSubmit}>
            <div class="titel-time-input">
                <div class="first-div">
                    <input class="recipe-title-input" type="text" bind:value={title} placeholder="Recipe title">
                    <input class="recipe-total-time-input" type="number" bind:value={totalMinutes} placeholder="Total time (min.)">
                </div>
                <input class="recipe-img-input" type="file" accept="image/*" on:change={handleFile} />
            </div>
            
            
            <div class="second-div">
                <p class="create-recipe-subtitle">Ingredients</p>
                <fieldset class="recipe-section"> 
                    {#each ingredients as ingredient, index}
                        <div class="list-row">
                            <input class="fieldset-input" type="text" bind:value={ingredients[index]}
                                placeholder="Enter ingredient here" />
                            {#if ingredients.length > 1}
                                <button class="remove-button" type="button"
                                    on:click={() => removeIngredient(index)}>X</button>
                            {/if}
                        </div>
                    {/each}
                    <button class="recipe-button" type="button" on:click={addIngredient}>+ Add ingredient</button>
                </fieldset>
            </div>
            
            <div class="third-div">
                <p class="create-recipe-subtitle">Steps</p>
                <fieldset class="recipe-section">
                    {#each steps as step, index}
                        <div class="list-row">
                            <input class="fieldset-input" type="text" bind:value={steps[index].text}
                                placeholder="Preheat the oven to 200°C" />
                            <input class="fieldset-input step-timer" type="number" min="0"
                                bind:value={steps[index].minutes} placeholder="min" />
                            {#if steps.length > 1}
                                <button class="remove-button" type="button"
                                    on:click={() => removeStep(index)}>X</button>
                            {/if}
                        </div>
                    {/each}
                    <button class="recipe-button" type="button" on:click={addStep}>+ Add step</button>
                </fieldset>
            </div>
            

            

            {#if imageData} 
                <img src={imageData} alt={title} class="image-preview" />
            {/if}

            <button type="submit">Save recipe</button>

        </form>
    </div>

</main>