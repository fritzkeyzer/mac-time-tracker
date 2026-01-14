import { ref, computed } from 'vue';
import ColorPicker from './ColorPicker.js';

export default {
    components: { ColorPicker },
    props: {
        categories: {
            type: Array,
            required: true
        },
        categoryRules: {
            type: Array,
            required: true
        }
    },
    emits: ['save-category', 'delete-category', 'save-category-rule', 'delete-category-rule'],
    setup(props, { emit }) {
        // Category form
        const editingCategory = ref(null);
        const categoryForm = ref({
            id: 0,
            name: '',
            color: '#3b82f6'
        });

        // Category rule form
        const editingRule = ref(null);
        const ruleForm = ref({
            id: 0,
            pattern: '',
            category_id: '',
            is_active: true
        });

        const startEditCategory = (category = null) => {
            if (category) {
                editingCategory.value = category.id;
                categoryForm.value = { ...category };
            } else {
                editingCategory.value = 'new';
                categoryForm.value = {
                    id: 0,
                    name: '',
                    color: '#3b82f6'
                };
            }
        };

        const cancelEditCategory = () => {
            editingCategory.value = null;
            categoryForm.value = {
                id: 0,
                name: '',
                color: '#3b82f6'
            };
        };

        const saveCategory = () => {
            if (!categoryForm.value.name) return;
            emit('save-category', { ...categoryForm.value });
            cancelEditCategory();
        };

        const deleteCategory = (id) => {
            if (confirm('Delete this category? This will also remove all associated rules.')) {
                emit('delete-category', id);
            }
        };

        const startEditRule = (rule = null) => {
            if (rule) {
                editingRule.value = rule.id;
                ruleForm.value = { ...rule };
            } else {
                editingRule.value = 'new';
                ruleForm.value = {
                    id: 0,
                    pattern: '',
                    category_id: props.categories[0]?.id || '',
                    is_active: true
                };
            }
        };

        const cancelEditRule = () => {
            editingRule.value = null;
            ruleForm.value = {
                id: 0,
                pattern: '',
                category_id: '',
                is_active: true
            };
        };

        const saveRule = () => {
            if (!ruleForm.value.pattern || !ruleForm.value.category_id) return;
            emit('save-category-rule', {
                ...ruleForm.value,
                category_id: parseInt(ruleForm.value.category_id)
            });
            cancelEditRule();
        };

        const deleteRule = (id) => {
            if (confirm('Delete this rule?')) {
                emit('delete-category-rule', id);
            }
        };

        const toggleRule = (rule) => {
            emit('save-category-rule', {
                ...rule,
                is_active: !rule.is_active
            });
        };

        const getCategoryName = (id) => {
            const category = props.categories.find(c => c.id === id);
            return category ? category.name : 'Unknown';
        };

        const getCategoryColor = (id) => {
            const category = props.categories.find(c => c.id === id);
            return category ? category.color : '#737373';
        };

        return {
            editingCategory,
            categoryForm,
            editingRule,
            ruleForm,
            startEditCategory,
            cancelEditCategory,
            saveCategory,
            deleteCategory,
            startEditRule,
            cancelEditRule,
            saveRule,
            deleteRule,
            toggleRule,
            getCategoryName,
            getCategoryColor
        };
    },
    template: `
        <div class="space-y-8">
            <!-- Categories Section -->
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-medium text-neutral-100">Categories</h3>
                        <p class="text-sm text-neutral-500 mt-1">Define categories with names and colors.</p>
                    </div>
                    <button
                        v-if="!editingCategory"
                        @click="startEditCategory()"
                        class="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        Add Category
                    </button>
                </div>

                <!-- Category Form -->
                <div v-if="editingCategory" class="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
                        {{ editingCategory === 'new' ? 'New Category' : 'Edit Category' }}
                    </h4>
                    <div class="space-y-4">
                        <div>
                            <label class="text-xs text-neutral-500 block mb-1.5">Name</label>
                            <input
                                v-model="categoryForm.name"
                                type="text"
                                placeholder="e.g. Development, Meetings, Email"
                                class="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-colors"
                            >
                        </div>
                        <div>
                            <label class="text-xs text-neutral-500 block mb-2">Color</label>
                            <ColorPicker v-model="categoryForm.color" />
                        </div>
                        <div class="flex gap-2">
                            <button
                                @click="saveCategory"
                                class="flex-1 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-lg font-medium text-sm transition-colors"
                            >
                                {{ editingCategory === 'new' ? 'Create' : 'Update' }}
                            </button>
                            <button
                                @click="cancelEditCategory"
                                class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Categories List -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div v-if="categories.length === 0" class="col-span-full text-center py-10 text-neutral-500 text-sm">
                        No categories defined yet.
                    </div>
                    <div
                        v-for="category in categories"
                        :key="category.id"
                        class="group flex items-center justify-between p-4 bg-neutral-900/20 border border-neutral-800/50 rounded-xl hover:border-neutral-700 transition-colors"
                    >
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: category.color }"></div>
                            <span class="font-medium text-neutral-200 truncate">{{ category.name }}</span>
                        </div>
                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <button
                                @click="startEditCategory(category)"
                                class="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button
                                @click="deleteCategory(category.id)"
                                class="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-neutral-800"></div>

            <!-- Category Rules Section -->
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-medium text-neutral-100">Category Rules</h3>
                        <p class="text-sm text-neutral-500 mt-1">Map app/window patterns to categories using regex.</p>
                    </div>
                    <button
                        v-if="!editingRule && categories.length > 0"
                        @click="startEditRule()"
                        class="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        Add Rule
                    </button>
                </div>

                <!-- Rule Form -->
                <div v-if="editingRule" class="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
                        {{ editingRule === 'new' ? 'New Rule' : 'Edit Rule' }}
                    </h4>
                    <div class="space-y-4">
                        <div>
                            <label class="text-xs text-neutral-500 block mb-1.5">Regex Pattern</label>
                            <input
                                v-model="ruleForm.pattern"
                                type="text"
                                placeholder="e.g. Slack|Zoom|Teams"
                                class="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-neutral-300 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-colors"
                            >
                        </div>
                        <div>
                            <label class="text-xs text-neutral-500 block mb-1.5">Category</label>
                            <select
                                v-model="ruleForm.category_id"
                                class="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-colors appearance-none"
                            >
                                <option value="" disabled>Select category...</option>
                                <option v-for="category in categories" :key="category.id" :value="category.id">
                                    {{ category.name }}
                                </option>
                            </select>
                        </div>
                        <div class="flex gap-2">
                            <button
                                @click="saveRule"
                                class="flex-1 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-lg font-medium text-sm transition-colors"
                            >
                                {{ editingRule === 'new' ? 'Create' : 'Update' }}
                            </button>
                            <button
                                @click="cancelEditRule"
                                class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Rules List -->
                <div class="space-y-3">
                    <div v-if="categoryRules.length === 0" class="text-center py-10 text-neutral-500 text-sm">
                        No rules defined yet.
                    </div>
                    <div
                        v-for="(rule, index) in categoryRules"
                        :key="rule.id"
                        class="group flex items-center justify-between p-4 bg-neutral-900/20 border border-neutral-800/50 rounded-xl hover:border-neutral-700 transition-colors"
                    >
                        <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            <div class="md:col-span-7 flex items-center gap-3">
                                <div class="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-mono text-neutral-400 flex-shrink-0">
                                    {{ index + 1 }}
                                </div>
                                <code class="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-400 truncate">{{ rule.pattern }}</code>
                            </div>
                            <div class="md:col-span-5">
                                <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium"
                                      :style="{ backgroundColor: getCategoryColor(rule.category_id) + '20', borderColor: getCategoryColor(rule.category_id) + '40', color: getCategoryColor(rule.category_id) }">
                                    <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getCategoryColor(rule.category_id) }"></span>
                                    {{ getCategoryName(rule.category_id) }}
                                </span>
                            </div>
                        </div>
                        <div class="ml-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                @click="toggleRule(rule)"
                                class="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                                :class="rule.is_active ? 'text-green-500' : 'text-neutral-600'"
                                :title="rule.is_active ? 'Disable rule' : 'Enable rule'"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h10"/><path d="M9 4v16"/><path d="m3 9 3 3-3 3"/><path d="M14 9l3 3-3 3"/></svg>
                            </button>
                            <button
                                @click="startEditRule(rule)"
                                class="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button
                                @click="deleteRule(rule.id)"
                                class="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
