import { ref, onMounted, computed } from 'vue';
import Navigation from "../components/Navigation.js";
import ProjectEditor from "../components/ProjectEditor.js";
import CategoryEditor from "../components/CategoryEditor.js";
import { useProjectsStore } from "../stores/useProjectsStore.js";
import { useCategoriesStore } from "../stores/useCategoriesStore.js";

export default {
    components: {
        Navigation,
        ProjectEditor,
        CategoryEditor
    },
    setup() {
        const projectsStore = useProjectsStore();
        const categoriesStore = useCategoriesStore();
        const activeTab = ref('projects');

        onMounted(async () => {
            await Promise.all([
                projectsStore.fetchProjects(),
                categoriesStore.fetchCategories()
            ]);
        });

        const projects = computed(() => projectsStore.state.projects);
        const projectRules = computed(() => projectsStore.state.projectRules);
        const categories = computed(() => categoriesStore.state.categories);
        const categoryRules = computed(() => categoriesStore.state.categoryRules);
        const isLoading = computed(() => projectsStore.state.isLoading || categoriesStore.state.isLoading);

        // Project handlers
        const handleSaveProject = async (project) => {
            try {
                await projectsStore.saveProject(project);
            } catch (error) {
                console.error('Failed to save project:', error);
            }
        };

        const handleDeleteProject = async (id) => {
            try {
                await projectsStore.deleteProject(id);
            } catch (error) {
                console.error('Failed to delete project:', error);
            }
        };

        const handleSaveProjectRule = async (rule) => {
            try {
                await projectsStore.saveProjectRule(rule);
            } catch (error) {
                console.error('Failed to save project rule:', error);
            }
        };

        const handleDeleteProjectRule = async (id) => {
            try {
                await projectsStore.deleteProjectRule(id);
            } catch (error) {
                console.error('Failed to delete project rule:', error);
            }
        };

        // Category handlers
        const handleSaveCategory = async (category) => {
            try {
                await categoriesStore.saveCategory(category);
            } catch (error) {
                console.error('Failed to save category:', error);
            }
        };

        const handleDeleteCategory = async (id) => {
            try {
                await categoriesStore.deleteCategory(id);
            } catch (error) {
                console.error('Failed to delete category:', error);
            }
        };

        const handleSaveCategoryRule = async (rule) => {
            try {
                await categoriesStore.saveCategoryRule(rule);
            } catch (error) {
                console.error('Failed to save category rule:', error);
            }
        };

        const handleDeleteCategoryRule = async (id) => {
            try {
                await categoriesStore.deleteCategoryRule(id);
            } catch (error) {
                console.error('Failed to delete category rule:', error);
            }
        };

        return {
            activeTab,
            projects,
            projectRules,
            categories,
            categoryRules,
            isLoading,
            handleSaveProject,
            handleDeleteProject,
            handleSaveProjectRule,
            handleDeleteProjectRule,
            handleSaveCategory,
            handleDeleteCategory,
            handleSaveCategoryRule,
            handleDeleteCategoryRule
        };
    },
    template: `
        <div class="flex h-full w-full bg-neutral-950 text-neutral-300 font-sans overflow-hidden">
            <!-- Left Sidebar -->
            <aside class="w-64 border-r border-neutral-800 bg-neutral-925 flex flex-col z-20 shadow-xl shrink-0">
                <div class="p-6 border-b border-neutral-800">
                    <h1 class="text-sm font-semibold tracking-wider text-neutral-100 uppercase">Chronos</h1>
                    <p class="text-xs text-neutral-500 mt-1">Local macOS Activity</p>
                </div>
                <Navigation />
            </aside>

            <!-- Main Content -->
            <main class="flex-1 flex flex-col relative overflow-hidden bg-neutral-950">
                <!-- Header -->
                <header class="h-16 border-b border-neutral-800 flex items-center justify-between px-8 bg-neutral-950/80 backdrop-blur z-10">
                    <h2 class="font-medium text-neutral-200 text-lg">Configuration</h2>

                    <!-- Tabs -->
                    <div class="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                        <button
                            @click="activeTab = 'projects'"
                            :class="[
                                'px-5 py-2 text-sm font-medium rounded-md transition-all duration-200',
                                activeTab === 'projects' ? 'bg-neutral-800 text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                            ]"
                        >
                            Projects
                        </button>
                        <button
                            @click="activeTab = 'categories'"
                            :class="[
                                'px-5 py-2 text-sm font-medium rounded-md transition-all duration-200',
                                activeTab === 'categories' ? 'bg-neutral-800 text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                            ]"
                        >
                            Categories
                        </button>
                    </div>
                </header>

                <!-- Loading State -->
                <div v-if="isLoading" class="flex-1 flex items-center justify-center">
                    <div class="text-neutral-500">Loading...</div>
                </div>

                <!-- Scrollable Content -->
                <div v-else class="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div class="max-w-6xl mx-auto">

                        <!-- Projects Tab -->
                        <ProjectEditor
                            v-if="activeTab === 'projects'"
                            :projects="projects"
                            :projectRules="projectRules"
                            @save-project="handleSaveProject"
                            @delete-project="handleDeleteProject"
                            @save-project-rule="handleSaveProjectRule"
                            @delete-project-rule="handleDeleteProjectRule"
                        />

                        <!-- Categories Tab -->
                        <CategoryEditor
                            v-if="activeTab === 'categories'"
                            :categories="categories"
                            :categoryRules="categoryRules"
                            @save-category="handleSaveCategory"
                            @delete-category="handleDeleteCategory"
                            @save-category-rule="handleSaveCategoryRule"
                            @delete-category-rule="handleDeleteCategoryRule"
                        />

                    </div>
                </div>
            </main>
        </div>
    `
};
