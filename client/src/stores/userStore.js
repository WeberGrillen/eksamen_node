import { writable } from "svelte/store";
import { fetchGet } from "../util/fetchUtil.js";

export const user = writable(null);

export async function checkAuth() {
    try {
        const result = await fetchGet('/api/session');
        user.set(result?.data ?? null);
    } catch {
        user.set(null);
    }
}