export function createEmptyRecipeForm() {
    return {
        title: '',
        description: '',
        category: '',
        totalMinutes: '',
        servings: '',
        difficulty: '',
        imageData: '',
        ingredients: [''],
        steps: [{ text: '', minutes: '' }]
    };
}

export function recipeToForm(recipe) {
    return {
        title: recipe.title,
        description: recipe.description ?? '',
        category: recipe.category ?? '',
        totalMinutes: recipe.total_minutes ?? '',
        servings: recipe.servings ?? '',
        difficulty: recipe.difficulty ?? '',
        imageData: recipe.image_data ?? '',

        ingredients: recipe.ingredients.length
            ? recipe.ingredients.map((ingredient) => ingredient.text)
            : [''],

        steps: recipe.steps.length
            ? recipe.steps.map((step) => ({
                text: step.text,
                minutes: step.timer_seconds ? step.timer_seconds / 60 : ''
            }))
            : [{ text: '', minutes: '' }]
    };
}

export function formToRecipeData(form) {
    const cleanIngredients = form.ingredients
        .map((text) => text.trim())
        .filter((text) => text !== '');

    const cleanSteps = form.steps
        .filter((step) => step.text.trim() !== '')
        .map((step) => ({
            text: step.text.trim(),
            timerSeconds: step.minutes === ''
                ? null
                : Number(step.minutes) * 60
        }));

    return {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        difficulty: form.difficulty || null,
        totalMinutes: form.totalMinutes === '' ? null : Number(form.totalMinutes),
        servings: form.servings === '' ? null : Number(form.servings),
        imageData: form.imageData || null,
        ingredients: cleanIngredients,
        steps: cleanSteps
    };
}