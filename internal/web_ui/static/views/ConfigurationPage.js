import { onMounted, computed } from 'vue';
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

        return {
            projects,
            projectRules,
            categories,
            categoryRules,
            isLoading
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
                <header class="h-16 border-b border-neutral-800 flex items-center justify-between px-8 bg-neutral-950/80 backdrop-blur z-10 shrink-0">
                    <h2 class="font-medium text-neutral-200 text-lg">Configuration</h2>
                </header>

                <!-- Loading State -->
                <div v-if="isLoading" class="flex-1 flex items-center justify-center">
                    <div class="text-neutral-500">Loading...</div>
                </div>

                <!-- Scrollable Content -->
                <div v-else class="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div class="max-w-[1600px] mx-auto">
                        <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <!-- Projects Column -->
                            <div class="min-w-0">
                                <ProjectEditor
                                    :projects="projects"
                                    :projectRules="projectRules"
                                />
                            </div>

                            <!-- Categories Column -->
                            <div class="min-w-0">
                                <CategoryEditor
                                    :categories="categories"
                                    :categoryRules="categoryRules"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `
};