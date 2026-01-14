import { ref } from 'vue';
import ColorPicker from './ColorPicker.js';
import { useProjectsStore } from '../stores/useProjectsStore.js';

export default {
    components: { ColorPicker },
    props: {
        projects: {
            type: Array,
            required: true
        },
        projectRules: {
            type: Array,
            required: true
        }
    },
    setup(props) {
        const store = useProjectsStore();
        
        // Editing State
        const editingProject = ref(null); // ID or 'new'
        const isSaving = ref(false);

        // Form Data
        const projectForm = ref({
            id: 0,
            name: '',
            color: '#3b82f6'
        });
        const localRules = ref([]);
        const originalRuleIds = ref(new Set());

        // Actions
        const getProjectRules = (projectId) => {
            return props.projectRules.filter(r => r.project_id === projectId);
        };

        const startEditProject = (project = null) => {
            if (project) {
                editingProject.value = project.id;
                projectForm.value = { ...project };
                // Deep copy rules for editing
                const rules = getProjectRules(project.id);
                localRules.value = rules.map(r => ({ ...r }));
                originalRuleIds.value = new Set(rules.map(r => r.id));
            } else {
                editingProject.value = 'new';
                projectForm.value = {
                    id: 0,
                    name: '',
                    color: '#3b82f6'
                };
                localRules.value = [];
                originalRuleIds.value = new Set();
            }
        };

        const cancelEditProject = () => {
            editingProject.value = null;
            projectForm.value = { id: 0, name: '', color: '#3b82f6' };
            localRules.value = [];
            originalRuleIds.value = new Set();
        };

        const addLocalRule = () => {
            localRules.value.push({
                id: 0,
                pattern: '',
                project_id: projectForm.value.id,
                is_active: true
            });
        };

        const removeLocalRule = (index) => {
            localRules.value.splice(index, 1);
        };

        const deleteProject = async (id) => {
            if (confirm('Delete this project? This will also remove all associated rules.')) {
                try {
                    await store.deleteProject(id);
                } catch (error) {
                    console.error('Failed to delete project:', error);
                }
            }
        };

        const saveAll = async () => {
            if (!projectForm.value.name) return;
            isSaving.value = true;

            try {
                // 1. Save Project Details
                const savedProject = await store.saveProject(projectForm.value);

                // 2. Handle Rules
                const promises = [];

                // Save updated/new rules
                for (const rule of localRules.value) {
                    // Ensure rule has the correct project ID (important for new projects)
                    const ruleToSave = {
                        ...rule,
                        project_id: savedProject.id
                    };
                    promises.push(store.saveProjectRule(ruleToSave));
                }

                // Delete removed rules
                // A rule is removed if its ID was in originalRuleIds but is NOT in the current localRules list
                const currentIds = new Set(localRules.value.map(r => r.id));
                for (const originalId of originalRuleIds.value) {
                    if (!currentIds.has(originalId)) {
                        promises.push(store.deleteProjectRule(originalId));
                    }
                }

                await Promise.all(promises);
                
                cancelEditProject();
            } catch (error) {
                console.error('Failed to save project and rules:', error);
                alert('Failed to save changes. Please try again.');
            } finally {
                isSaving.value = false;
            }
        };

        return {
            editingProject,
            isSaving,
            projectForm,
            localRules,
            getProjectRules,
            startEditProject,
            cancelEditProject,
            deleteProject,
            addLocalRule,
            removeLocalRule,
            saveAll
        };
    },
    template: `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-medium text-neutral-100">Projects</h3>
                    <p class="text-sm text-neutral-500 mt-1">Manage projects and their detection rules.</p>
                </div>
                <button
                    v-if="editingProject !== 'new'"
                    @click="startEditProject()"
                    class="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Add Project
                </button>
            </div>

            <div class="space-y-4">
                <!-- New Project Form -->
                <div v-if="editingProject === 'new'" class="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 border-l-4 border-l-blue-500">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">New Project</h4>
                    
                    <div class="space-y-4 mb-6">
                        <div>
                            <label class="text-xs text-neutral-500 block mb-1.5">Name</label>
                            <input
                                v-model="projectForm.name"
                                type="text"
                                placeholder="e.g. Website Redesign"
                                class="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-colors"
                            >
                        </div>
                        <div>
                            <label class="text-xs text-neutral-500 block mb-2">Color</label>
                            <ColorPicker v-model="projectForm.color" />
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="text-xs text-neutral-500 block mb-2">Detection Rules</label>
                        <div class="space-y-2">
                            <div v-for="(rule, index) in localRules" :key="index" class="flex gap-2 items-center">
                                <input 
                                    v-model="rule.pattern"
                                    type="text" 
                                    class="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-sm font-mono text-neutral-300 focus:outline-none focus:border-neutral-600"
                                    placeholder="Regex Pattern (e.g. ^Figma$)"
                                >
                                <button 
                                    @click="rule.is_active = !rule.is_active" 
                                    class="px-2 py-1 flex items-center gap-2 border border-neutral-800 rounded hover:bg-neutral-800 transition-colors shrink-0 min-w-[80px]"
                                    :title="rule.is_active ? 'Deactivate Rule' : 'Activate Rule'"
                                >
                                    <div 
                                        class="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]"
                                        :class="rule.is_active ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'"
                                    ></div>
                                    <span class="text-[10px] font-bold uppercase tracking-tight"
                                        :class="rule.is_active ? 'text-green-500/80' : 'text-red-500/80'"
                                    >
                                        {{ rule.is_active ? 'Active' : 'Disabled' }}
                                    </span>
                                </button>
                                <button @click="removeLocalRule(index)" class="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors" title="Remove Rule">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                            </div>
                            <button 
                                @click="addLocalRule"
                                class="text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors mt-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                                Add Rule
                            </button>
                        </div>
                    </div>

                    <div class="flex gap-2 pt-2 border-t border-neutral-800/50">
                        <button
                            @click="saveAll"
                            :disabled="isSaving"
                            class="flex-1 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                        >
                            {{ isSaving ? 'Saving...' : 'Create Project' }}
                        </button>
                        <button
                            @click="cancelEditProject"
                            class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                <!-- Projects List -->
                <div v-if="projects.length === 0 && editingProject !== 'new'" class="text-center py-10 text-neutral-500 text-sm">
                    No projects defined yet.
                </div>

                <div
                    v-for="project in projects"
                    :key="project.id"
                    class="bg-neutral-900/20 border border-neutral-800/50 rounded-xl overflow-hidden transition-all duration-200"
                    :class="{ 'ring-1 ring-neutral-700 bg-neutral-900/40': editingProject === project.id }"
                >
                    <!-- EDIT MODE -->
                    <div v-if="editingProject === project.id" class="p-4">
                        <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">Edit Project</h4>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label class="text-xs text-neutral-500 block mb-1.5">Name</label>
                                <input
                                    v-model="projectForm.name"
                                    type="text"
                                    class="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-colors"
                                >
                            </div>
                            <div>
                                <label class="text-xs text-neutral-500 block mb-2">Color</label>
                                <ColorPicker v-model="projectForm.color" />
                            </div>
                        </div>

                        <div class="mb-6">
                            <label class="text-xs text-neutral-500 block mb-2">Detection Rules</label>
                            <div class="space-y-2">
                                <div v-for="(rule, index) in localRules" :key="index" class="flex gap-2 items-center">
                                    <input 
                                        v-model="rule.pattern"
                                        type="text" 
                                        class="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-sm font-mono text-neutral-300 focus:outline-none focus:border-neutral-600"
                                        placeholder="Regex Pattern"
                                    >
                                    <button 
                                        @click="rule.is_active = !rule.is_active" 
                                        class="px-2 py-1 flex items-center gap-2 border border-neutral-800 rounded hover:bg-neutral-800 transition-colors shrink-0 min-w-[80px]"
                                        :title="rule.is_active ? 'Deactivate Rule' : 'Activate Rule'"
                                    >
                                        <div 
                                            class="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]"
                                            :class="rule.is_active ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'"
                                        ></div>
                                        <span class="text-[10px] font-bold uppercase tracking-tight"
                                            :class="rule.is_active ? 'text-green-500/80' : 'text-red-500/80'"
                                        >
                                            {{ rule.is_active ? 'Active' : 'Disabled' }}
                                        </span>
                                    </button>
                                    <button @click="removeLocalRule(index)" class="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors" title="Remove Rule">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                    </button>
                                </div>
                                <button 
                                    @click="addLocalRule"
                                    class="text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors mt-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                                    Add Rule
                                </button>
                            </div>
                        </div>

                        <div class="flex gap-2 pt-2 border-t border-neutral-800/50">
                            <button
                                @click="saveAll"
                                :disabled="isSaving"
                                class="flex-1 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                            >
                                {{ isSaving ? 'Saving...' : 'Save Changes' }}
                            </button>
                            <button
                                @click="cancelEditProject"
                                class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>

                    <!-- VIEW MODE -->
                    <template v-else>
                        <div class="p-4 flex items-center justify-between gap-4 border-b border-neutral-800/50 bg-neutral-900/20">
                            <div class="flex-1 min-w-0 flex items-center gap-3">
                                <div class="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-neutral-800" :style="{ backgroundColor: project.color }"></div>
                                <h4 class="font-medium text-neutral-200 truncate text-base">{{ project.name }}</h4>
                                <span class="text-xs text-neutral-500 bg-neutral-800/50 px-2 py-0.5 rounded-full border border-neutral-800">
                                    {{ getProjectRules(project.id).length }} rules
                                </span>
                            </div>

                            <div class="flex items-center gap-1">
                                <button
                                    @click="startEditProject(project)"
                                    class="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
                                    title="Edit Project"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                </button>
                                <button
                                    @click="deleteProject(project.id)"
                                    class="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                                    title="Delete Project"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </div>

                        <div class="p-4 bg-neutral-900/10">
                            <div v-if="getProjectRules(project.id).length > 0" class="space-y-2">
                                <div
                                    v-for="rule in getProjectRules(project.id)"
                                    :key="rule.id"
                                    class="flex items-center gap-3"
                                >
                                    <div 
                                        class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        :class="rule.is_active ? 'bg-green-500' : 'bg-neutral-700'"
                                    ></div>
                                    <code class="text-xs font-mono text-neutral-400 truncate bg-neutral-950/50 px-1.5 py-0.5 rounded border border-neutral-800/50 flex-1">
                                        {{ rule.pattern }}
                                    </code>
                                </div>
                            </div>
                            <div v-else class="text-xs text-neutral-600 italic">No rules.</div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    `
};