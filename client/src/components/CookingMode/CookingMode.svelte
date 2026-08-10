<script>
    import { onDestroy, createEventDispatcher } from "svelte";

    export let recipe;

    const dispatch = createEventDispatcher();

    let index = 0;
    let remaining = null;
    let running = false;
    let interval = null;

    $: step = recipe.steps[index];
    $: index, resetTimer();

    function resetTimer() {
        stop();
        remaining = recipe.steps[index]?.timer_seconds ?? null;
    }
    
    function stop() {
        clearInterval(interval);
        interval = null;
        running = false;
    }

    function toggleTimer() {
        if (remaining === null) return;
        
        if (running) {
            stop();
            return;
        }

        running = true;
        interval = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) stop();            
        }, 1000)
    }

    function next() {
        if (index < recipe.steps.length -1) index += 1;
    }

    function back() {
        if (index > 0) index -= 1;
    }

    function close() {
        stop();
        dispatch('close');
    }

    function handleKeydown(event) {
        if (event.key === 'ArrowRight') next();
        else if (event.key === 'ArrowLeft') back();
        else if (event.key === 'Escape') close();
        else if (event.key === ' ') {
            event.preventDefault();
            toggleTimer();
        }
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    onDestroy(stop);
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="cooking-overlay">
    <button class="cooking-close" on:click={close} aria-label="Exit cooking mode">x</button>

    <p class="cooking-recipe-title">{recipe.title}</p>
    <p class="cooking-step-count">Step {index + 1} of {recipe.steps.length}</p>

    <button class="cooking-timer" on:click={toggleTimer} disabled={remaining === null}>
        <span class="cooking-timer-value">
            {remaining === null ? '—' : formatTime(remaining)}
        </span>
        {#if remaining !== null}
            <span class="cooking-timer-icon">{running ? '❚❚' : '▶'}</span>
        {/if}
    </button>

    <p class="cooking-step-text">{step.text}</p>

    <div class="cooking-nav">
        <button on:click={back} disabled={index === 0}>‹ Back</button>

        <div class="cooking-dots">
            {#each recipe.steps as _, i}
                <span class="cooking-dot" class:active={i === index}></span>
            {/each}
        </div>

        <button on:click={next} disabled={index === recipe.steps.length - 1}>Next ›</button>
    </div>

    <p class="cooking-hint">
        ← → to move between steps · Space to play or pause · Esc to exit
    </p>
</div>