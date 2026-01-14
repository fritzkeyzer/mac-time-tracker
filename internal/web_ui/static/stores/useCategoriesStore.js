import { reactive, readonly } from 'vue';

const state = reactive({
    categories: [],
    categoryRules: [],
    isLoading: false,
    error: null
});

// Fetch all categories and category rules
const fetchCategories = async () => {
    state.isLoading = true;
    state.error = null;
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        state.categories = data.categories || [];
        state.categoryRules = data.category_rules || [];
    } catch (err) {
        state.error = err.message;
        console.error(err);
    } finally {
        state.isLoading = false;
    }
};

// --- Categories ---

const saveCategory = async (category) => {
    try {
        const response = await fetch('/api/categories/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(category)
        });
        if (!response.ok) throw new Error('Failed to save category');
        const savedCategory = await response.json();

        // Update local state
        const index = state.categories.findIndex(c => c.id === savedCategory.id);
        if (index >= 0) {
            state.categories[index] = savedCategory;
        } else {
            state.categories.push(savedCategory);
        }

        return savedCategory;
    } catch (err) {
        state.error = err.message;
        throw err;
    }
};

const deleteCategory = async (id) => {
    try {
        const response = await fetch('/api/categories/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error('Failed to delete category');

        // Update local state
        state.categories = state.categories.filter(c => c.id !== id);
        // Also remove related rules
        state.categoryRules = state.categoryRules.filter(r => r.category_id !== id);
    } catch (err) {
        state.error = err.message;
        throw err;
    }
};

// --- Category Rules ---

const saveCategoryRule = async (rule) => {
    try {
        const response = await fetch('/api/categories/rules/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule)
        });
        if (!response.ok) throw new Error('Failed to save category rule');

        // Refresh to get the updated rule with joined data
        await fetchCategories();
    } catch (err) {
        state.error = err.message;
        throw err;
    }
};

const deleteCategoryRule = async (id) => {
    try {
        const response = await fetch('/api/categories/rules/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error('Failed to delete category rule');

        // Update local state
        state.categoryRules = state.categoryRules.filter(r => r.id !== id);
    } catch (err) {
        state.error = err.message;
        throw err;
    }
};

export const useCategoriesStore = () => {
    return {
        state: readonly(state),
        fetchCategories,
        saveCategory,
        deleteCategory,
        saveCategoryRule,
        deleteCategoryRule
    };
};
