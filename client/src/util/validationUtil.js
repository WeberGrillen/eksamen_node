export function isValidEmail() {
        emailTouched = true;
        emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };