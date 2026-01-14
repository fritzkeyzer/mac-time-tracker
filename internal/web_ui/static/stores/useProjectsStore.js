import { reactive, readonly } from 'vue';

const state = reactive({
    projects: [],
    projectRules: [],
    isLoading: false,
    error: null
});

// Fetch all projects and project rules
const fetchProjects = async () => {
    state.isLoading = true;
    state.error = null;
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        const data = await response.json();
        state.projects = data.projects || [];
        state.projectRules = data.project_rules || [];
    } catch (err) {
        state.error = err.message;
        console.error(err);
    } finally {
        state.isLoading = false;
    }
};

// --- Projects ---

const saveProject = async (project) => {
    try {
        const response = await fetch('/api/projects/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        if (!response.ok) throw new Error('Failed to save project');
        const savedProject = await response.json();

        // Update local state
        const index = state.projects.findIndex(p => p.id === savedProject.id);
        if (index >= 0) {
            state.projects[index] = savedProject;
        } else {
            state.projects.push(savedProject);
        }

        return savedProject;
    } catch (err) {
        state.error = err.message;
        throw err;
    }
};

const deleteProject = async (id) => {
    try {
        const response = await fetch('/api/projects/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error('Failed to delete project');

        // Update local state
        state.projects = state.projects.filter(p => p.id !== id);
        // Also remove related rules
        state.projectRules = state.projectRules.filter(r => r.project_id !== id);
    } catch (err) {
        state.error = err.message;
        throw err;
    }
};

// --- Project Rules ---

const saveProjectRule = async (rule) => {
    try {
        const response = await fetch('/api/projects/rules/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule)
        });
        if (!response.ok) throw new Error('Failed to save project rule');

        // Refresh to get the updated rule with joined data
        await fetchProjects();
    } catch (err) {
        state.error = err.message;
        throw err;
    }
};

const deleteProjectRule = async (id) => {
    try {
        const response = await fetch('/api/projects/rules/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error('Failed to delete project rule');

        // Update local state
        state.projectRules = state.projectRules.filter(r => r.id !== id);
    } catch (err) {
        state.error = err.message;
        throw err;
    }
};

export const useProjectsStore = () => {
    return {
        state: readonly(state),
        fetchProjects,
        saveProject,
        deleteProject,
        saveProjectRule,
        deleteProjectRule
    };
};
