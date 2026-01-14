import { reactive, readonly } from 'vue';

const state = reactive({
    total_seconds: 0,
    apps: [],
    projects: [],
    categories: [],
    isLoading: false,
    error: null
});

const fetchOverview = async (start = 0, end = 0) => {
    state.isLoading = true;
    state.error = null;

    try {
        const response = await fetch('/api/overview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, end })
        });

        if (!response.ok) throw new Error('Failed to fetch overview data');

        const data = await response.json();
        state.total_seconds = data.total_seconds || 0;
        state.apps = data.apps || [];
        state.projects = data.projects || [];
        state.categories = data.categories || [];
    } catch (err) {
        state.error = err.message;
        console.error(err);
        state.total_seconds = 0;
        state.apps = [];
        state.projects = [];
        state.categories = [];
    } finally {
        state.isLoading = false;
    }
};

export const useOverviewStore = () => {
    return {
        state: readonly(state),
        fetchOverview
    };
};
