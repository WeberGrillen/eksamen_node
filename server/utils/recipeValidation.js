const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drinks'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const MAX_IMAGE_CHARS = 2_000_000;

export function validateRecipe(body) {
    const { title, description, imageData, category, totalMinutes,
            servings, difficulty, ingredients, steps } = body;

    const cleanIngredients = (Array.isArray(ingredients) ? ingredients : [])
        .map((text) => String(text ?? '').trim())
        .filter((text) => text !== '');

    const cleanSteps = (Array.isArray(steps) ? steps : [])
        .filter((step) => step?.text?.trim())
        .map((step) => ({ text: step.text.trim(), timerSeconds: step.timerSeconds ?? null }));

    const cleanCategory = category?.trim() || null;
    const cleanDifficulty = difficulty?.trim() || null;

    if (!title?.trim())
        return { errorMessage: 'Title is required' };

    if (cleanIngredients.length === 0)
        return { errorMessage: 'At least one ingredient is required' };
    
    if (cleanSteps.length === 0)
        return { errorMessage: 'At least one step is required' };

    if (cleanCategory && !CATEGORIES.includes(cleanCategory))
        return { errorMessage: 'Please choose a valid category' };

    if (cleanDifficulty && !DIFFICULTIES.includes(cleanDifficulty))
        return { errorMessage: 'Please choose a valid difficulty' };

    if (imageData) {
        if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
            return { errorMessage: 'Invalid image' };
        }
        if (imageData.length > MAX_IMAGE_CHARS) {
            return { errorMessage: 'Image is too large' };
        }
    }

    return {
        clean: {
            title: title.trim(),
            description: description ?? null,
            imageData: imageData ?? null,
            category: cleanCategory,
            difficulty: cleanDifficulty,
            totalMinutes: totalMinutes ?? null,
            servings: servings ?? null,
            ingredients: cleanIngredients,
            steps: cleanSteps
        }
    };
}