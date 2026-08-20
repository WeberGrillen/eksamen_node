export function formatMinutes(seconds) {
    return `${Math.round(seconds / 60)} min`;
}

export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secondsLeft = seconds % 60;

    return `${minutes}:${String(secondsLeft).padStart(2, '0')}`;
}