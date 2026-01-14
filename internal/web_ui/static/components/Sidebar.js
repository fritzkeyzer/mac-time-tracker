import Navigation from "./Navigation.js";

export default {
    components: {Navigation},
    props: {
        selectedActivity: {
            type: Object,
            default: null
        },
        detailsVisible: {
            type: Boolean,
            default: false
        }
    },
    template: `
        <aside class="w-64 border-r border-neutral-800 bg-neutral-925 flex flex-col z-20 shadow-xl shrink-0">
            <div class="p-6 border-b border-neutral-800">
                <h1 class="text-sm font-semibold tracking-wider text-neutral-100 uppercase">Chronos</h1>
                <p class="text-xs text-neutral-500 mt-1">Local macOS Activity</p>
            </div>

            <!-- Navigation -->
            <Navigation />

            <!-- Stats -->
            <div class="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <h2 class="text-xs font-medium text-neutral-500 mb-3 uppercase tracking-wide">Today's Focus</h2>
                    <!-- Placeholder Stats -->
                    <div class="flex items-end gap-2">
                        <span class="text-3xl font-light text-white">--</span>
                    </div>
                </div>
            </div>

            <!-- Selected Block Info -->
            <div
                class="p-4 border-t border-neutral-800 bg-neutral-900 min-h-[140px] transition-opacity duration-300"
                :class="{ 'opacity-0': !detailsVisible, 'opacity-100': detailsVisible }"
            >
                <div v-if="selectedActivity">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-mono text-neutral-500">{{ selectedActivity.timeRange }}</span>
                    </div>
                    <h3 class="text-sm font-medium text-white leading-snug break-words">{{ selectedActivity.appName }}</h3>
                    <p v-if="selectedActivity.isWindow" class="text-xs text-blue-400 mt-1 italic">{{ selectedActivity.title }}</p>
                    <p class="text-xs text-neutral-400 mt-2">Duration: {{ selectedActivity.duration }}</p>
                </div>
            </div>
        </aside>
    `
};
