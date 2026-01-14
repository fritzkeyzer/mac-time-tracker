import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import Navigation from "../components/Navigation.js";
import { useTimelineStore } from "../stores/useTimelineStore.js";

export default {
    components: { Navigation },
    setup() {
        const store = useTimelineStore();
        
        // --- Date Logic (ported from DateRangeFilter) ---
        const rangeType = ref('day'); // 'day', 'week', 'month'
        const currentDate = ref(new Date());

        const getRangeStart = (date, type) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            if (type === 'day') return d;
            if (type === 'week') {
                const day = d.getDay();
                const diff = d.getDate() - day;
                d.setDate(diff);
                return d;
            }
            if (type === 'month') {
                d.setDate(1);
                return d;
            }
            return d;
        };

        const getRangeEnd = (date, type) => {
            const d = new Date(date);
            d.setHours(23, 59, 59, 999);
            if (type === 'day') return d;
            if (type === 'week') {
                const day = d.getDay();
                const diff = d.getDate() + (6 - day);
                d.setDate(diff);
                return d;
            }
            if (type === 'month') {
                d.setMonth(d.getMonth() + 1);
                d.setDate(0);
                return d;
            }
            return d;
        };

        const fetchDataForRange = async () => {
            const start = Math.floor(getRangeStart(currentDate.value, rangeType.value).getTime() / 1000);
            const end = Math.floor(getRangeEnd(currentDate.value, rangeType.value).getTime() / 1000);
            await store.fetchData(start, end);
        };

        const setRangeType = (type) => {
            rangeType.value = type;
            fetchDataForRange();
        };

        const goBack = () => {
            const d = new Date(currentDate.value);
            if (rangeType.value === 'day') d.setDate(d.getDate() - 1);
            else if (rangeType.value === 'week') d.setDate(d.getDate() - 7);
            else if (rangeType.value === 'month') d.setMonth(d.getMonth() - 1);
            currentDate.value = d;
            fetchDataForRange();
        };

        const goForward = () => {
            const d = new Date(currentDate.value);
            if (rangeType.value === 'day') d.setDate(d.getDate() + 1);
            else if (rangeType.value === 'week') d.setDate(d.getDate() + 7);
            else if (rangeType.value === 'month') d.setMonth(d.getMonth() + 1);
            currentDate.value = d;
            fetchDataForRange();
        };

        const goToToday = () => {
            currentDate.value = new Date();
            fetchDataForRange();
        };

        const headerDate = computed(() => {
            const d = currentDate.value;
            if (rangeType.value === 'day') {
                return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
            } else if (rangeType.value === 'week') {
                const start = getRangeStart(d, 'week');
                const end = getRangeEnd(d, 'week');
                return `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
            } else {
                return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
            }
        });

        // --- Data Processing ---
        const processedSpans = computed(() => {
            if (!store.spans.value) return [];
            
            // Sort descending (newest first)
            const sorted = [...store.spans.value].sort((a, b) => b.span.start_at - a.span.start_at);
            
            let prevProjSig = null;
            let lastDateStr = null;
            const result = [];

            sorted.forEach(item => {
                const s = item.span;
                const d = new Date(s.start_at * 1000);
                const dateStr = d.toDateString();

                // Insert Date Header if date changes
                if (dateStr !== lastDateStr && rangeType.value !== 'day') {
                    result.push({
                        type: 'date-header',
                        id: 'dh-' + dateStr,
                        label: d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
                        dateObj: d
                    });
                    lastDateStr = dateStr;
                    // Reset context grouping on new day for cleaner visuals
                    prevProjSig = null;
                }
                
                const categories = item.categories || [];
                const projects = item.projects || [];

                // Create signature for comparison
                const projSig = projects.map(p => p.id).join(',');

                const isNewProj = projSig !== prevProjSig;

                prevProjSig = projSig;

                result.push({
                    ...item,
                    type: 'entry',
                    id: s.id, // Ensure top-level ID for keying
                    categories,
                    projects,
                    isNewProj
                });
            });

            return result;
        });

        const viewStats = computed(() => {
            const spans = store.spans.value || [];
            if (spans.length === 0) return { count: 0, duration: '0s' };

            const totalSeconds = spans.reduce((acc, curr) => acc + (curr.span.end_at - curr.span.start_at), 0);
            
            // Format duration
            let durationStr = '';
            if (totalSeconds < 60) durationStr = `${totalSeconds}s`;
            else {
                const m = Math.floor(totalSeconds / 60);
                const s = totalSeconds % 60;
                if (m < 60) durationStr = `${m}m ${s > 0 ? s + 's' : ''}`;
                else {
                    const h = Math.floor(m / 60);
                    const remM = m % 60;
                    durationStr = `${h}h ${remM}m`;
                }
            }

            return {
                count: spans.length,
                duration: durationStr
            };
        });

        const formatTime = (unixTimestamp) => {
            return new Date(unixTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const formatDuration = (from, to) => {
            const totalSeconds = to - from;
            if (totalSeconds < 60) return `${totalSeconds}s`;

            const minutes = Math.floor(totalSeconds / 60);
            if (minutes < 60) return `${minutes}m`;

            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        };

        const getAppInitial = (appName) => {
            return appName ? appName.charAt(0).toUpperCase() : '?';
        };

        // Init
        const refreshInterval = ref(null);

        const startRefreshInterval = () => {
            if (refreshInterval.value) return; // Already running
            refreshInterval.value = setInterval(fetchDataForRange, 30_000);
        };

        const stopRefreshInterval = () => {
            if (refreshInterval.value) {
                clearInterval(refreshInterval.value);
                refreshInterval.value = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab is hidden — stop polling
                stopRefreshInterval();
            } else {
                // Tab is visible again — refresh immediately and restart interval
                fetchDataForRange();
                startRefreshInterval();
            }
        };

        onMounted(() => {
            // Initial load
            fetchDataForRange();
            startRefreshInterval();

            // Listen for visibility changes
            document.addEventListener('visibilitychange', handleVisibilityChange);
        });

        onUnmounted(() => {
            stopRefreshInterval();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        });

        return {
            isLoading: store.isLoading,
            processedSpans,
            viewStats,
            // Date Controls
            rangeType,
            setRangeType,
            goBack,
            goForward,
            goToToday,
            headerDate,
            // Helpers
            formatTime,
            formatDuration,
            getAppInitial
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
                <header class="shrink-0 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 shadow-sm z-30">
                    <div class="max-w-6xl mx-auto px-6 py-4">
                        <!-- Controls Row -->
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-6">
                                <h1 class="text-xs font-semibold tracking-wide uppercase text-neutral-500">Activity Log</h1>

                                <!-- View Switcher -->
                                <div class="flex bg-neutral-900 rounded-md p-0.5 border border-neutral-800">
                                    <button 
                                        @click="setRangeType('day')"
                                        :class="['px-3 py-1 text-[10px] font-medium rounded shadow-sm border transition-colors', rangeType === 'day' ? 'text-white bg-neutral-800 border-neutral-700/50' : 'text-neutral-500 border-transparent hover:text-neutral-300']"
                                    >Day</button>
                                    <button 
                                        @click="setRangeType('week')"
                                        :class="['px-3 py-1 text-[10px] font-medium rounded shadow-sm border transition-colors', rangeType === 'week' ? 'text-white bg-neutral-800 border-neutral-700/50' : 'text-neutral-500 border-transparent hover:text-neutral-300']"
                                    >Week</button>
                                    <button 
                                        @click="setRangeType('month')"
                                        :class="['px-3 py-1 text-[10px] font-medium rounded shadow-sm border transition-colors', rangeType === 'month' ? 'text-white bg-neutral-800 border-neutral-700/50' : 'text-neutral-500 border-transparent hover:text-neutral-300']"
                                    >Month</button>
                                </div>
                            </div>

                            <!-- Navigation Controls -->
                            <div class="flex items-center gap-2">
                                <button @click="goBack" class="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                </button>
                                <button @click="goToToday" class="px-3 py-1 text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors border border-transparent hover:border-neutral-700">Today</button>
                                <button @click="goForward" class="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                </button>
                            </div>
                        </div>

                        <!-- Date & Stats Row -->
                        <div class="flex items-end justify-between">
                            <div>
                                <div class="flex items-baseline gap-3">
                                    <h2 class="text-xl font-medium text-white">{{ headerDate }}</h2>
                                    <span class="text-xs font-mono text-neutral-500 border-l border-neutral-800 pl-3">{{ viewStats.duration }}</span>
                                </div>
                            </div>

                            <div class="flex items-center gap-4">
                                <div class="text-right">
                                    <div class="text-[10px] uppercase tracking-wider text-neutral-600">Total Entries</div>
                                    <div class="font-mono text-sm text-neutral-400">{{ viewStats.count }}</div>
                                </div>
                                <div class="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 border border-neutral-700/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Scrollable List Area -->
                <div class="flex-1 overflow-y-auto custom-scrollbar">
                    <div class="max-w-6xl mx-auto py-8">
                        <!-- Loading State -->
                        <div v-if="isLoading && processedSpans.length === 0" class="px-4 py-20 text-center text-neutral-500">Loading activity data...</div>

                        <!-- Empty State -->
                        <div v-else-if="processedSpans.length === 0" class="px-4 py-20 text-center text-neutral-500">
                            No activity recorded for this period.
                        </div>

                        <!-- Timeline Rows -->
                        <div v-else class="flex flex-col px-4">
                            <template v-for="item in processedSpans" :key="item.id">
                                
                                <!-- Date Header Row -->
                                <div v-if="item.type === 'date-header'" class="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 py-3 px-2 flex items-center">
                                    <div class="w-2 h-2 rounded-full bg-neutral-700 mr-3"></div>
                                    <span class="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">{{ item.label }}</span>
                                </div>

                                <!-- Entry Row -->
                                <div v-else class="grid grid-cols-12 gap-0 hover:bg-neutral-900/50 min-h-[1.75rem]">
                                    
                                    <!-- Left Col: Meta Lines -->
                                    <div class="col-span-3 flex items-stretch relative gap-2">
                                        <!-- Context Labels -->
                                        <div class="flex flex-col justify-start overflow-hidden min-w-0 w-full">
                                            <div v-if="item.isNewProj && item.projects.length > 0" class="flex flex-row justify-end items-center gap-2">
                                                <div v-for="proj in item.projects" :key="'lbl-proj-'+proj.id" class="text-[9px] underline underline-offset-4 font-bold uppercase tracking-wider text-neutral-400 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis text-end" :title="proj.name"
                                                    :style="{ textDecorationColor: proj.color }"
                                                >
                                                    {{ proj.name }}
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Project Track -->
                                        <div class="flex flex-shrink-0 mr-3">
                                            <div v-if="!item.projects || item.projects.length === 0" class="w-1.5 rounded-sm bg-transparent"></div>
                                            <div v-else v-for="proj in item.projects" :key="'trk-proj-'+proj.id"
                                                class="w-1.5 mr-0.5 last:mr-0 rounded-sm opacity-80" 
                                                :style="{ backgroundColor: proj.color }"
                                                :title="proj.name">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Right Col: Content -->
                                    <div class="col-span-9 pl-4 py-1 flex items-center gap-3 transition-colors rounded-r">
                                        <!-- Time -->
                                        <div class="flex items-center gap-3">
                                            <div class="text-[10px] font-mono text-neutral-600 w-12 flex-shrink-0 text-nowrap">
                                                {{ formatTime(item.span.start_at) }}
                                            </div>
                                            <div class="text-[10px] font-mono text-neutral-600 w-6 flex-shrink-0 text-nowrap">
                                                {{ formatDuration(item.span.start_at, item.span.end_at) }}
                                            </div>
                                        </div>
                                        

                                        <!-- Details -->
                                        <div class="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
                                             <span class="text-xs font-medium text-neutral-300 whitespace-nowrap">{{ item.span.app_name }}</span>
                                             <span class="text-[11px] text-neutral-500 truncate font-light ml-1">{{ item.span.window_title || 'Untitled' }}</span>
                                        </div>
                                        
                                        <!-- Dots Container -->
                                        <div class="flex items-center gap-1">
                                            <div v-for="cat in item.categories" :key="'dot-cat-'+cat.id" class="w-2 h-2 rounded-full opacity-80" :style="{ backgroundColor: cat.color }" :title="'Category: ' + cat.name"></div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    `
};
