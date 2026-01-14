import { ref, computed, watch, onMounted } from 'vue';
import Navigation from "../components/Navigation.js";
import DetailedTimeline from "../components/DetailedTimeline.js";
import { useOverviewStore } from "../stores/useOverviewStore.js";

export default {
    components: { Navigation, DetailedTimeline },
    setup() {
        const store = useOverviewStore();

        const periods = ['Day', 'Week', 'Month'];
        const selectedPeriod = ref('Day');
        const referenceDate = ref(new Date());

        // Selection State
        const selectedDetail = ref(null); // { type: 'App'|'Project'|'Category', data: object }

        // Formatters
        const formatTime = (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        };

        const formatDate = (date, options) => new Intl.DateTimeFormat('en-US', options).format(date);

        // Date Logic
        const dateRangeLabel = computed(() => {
            const d = referenceDate.value;
            if (selectedPeriod.value === 'Day') {
                return formatDate(d, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
            }
            if (selectedPeriod.value === 'Week') {
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                const start = new Date(d);
                start.setDate(diff);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);

                if (start.getMonth() === end.getMonth()) {
                    return `${formatDate(start, { month: 'short', day: 'numeric' })} - ${formatDate(end, { day: 'numeric', year: 'numeric' })}`;
                }
                return `${formatDate(start, { month: 'short', day: 'numeric' })} - ${formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }
            if (selectedPeriod.value === 'Month') {
                return formatDate(d, { month: 'long', year: 'numeric' });
            }
            return '';
        });

        const getRangeTimestamps = () => {
            const d = new Date(referenceDate.value);
            let start, end;

            if (selectedPeriod.value === 'Day') {
                start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
            } else if (selectedPeriod.value === 'Week') {
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                start = new Date(d.getFullYear(), d.getMonth(), diff);
                end = new Date(start);
                end.setDate(start.getDate() + 7);
            } else if (selectedPeriod.value === 'Month') {
                start = new Date(d.getFullYear(), d.getMonth(), 1);
                end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            }
            return { start: Math.floor(start.getTime() / 1000), end: Math.floor(end.getTime() / 1000) };
        };

        const loadData = () => {
            const { start, end } = getRangeTimestamps();
            store.fetchOverview(start, end);
            selectedDetail.value = null;
        };

        const navigate = (direction) => {
            const d = new Date(referenceDate.value);
            const val = direction === 'prev' ? -1 : 1;

            if (selectedPeriod.value === 'Day') {
                d.setDate(d.getDate() + val);
            } else if (selectedPeriod.value === 'Week') {
                d.setDate(d.getDate() + (val * 7));
            } else if (selectedPeriod.value === 'Month') {
                d.setMonth(d.getMonth() + val);
            }
            referenceDate.value = d;
            loadData();
        };

        const setToday = () => {
            referenceDate.value = new Date();
            loadData();
        };

        const selectDetail = (type, data) => {
            const name = data.name || data.label;
            if (selectedDetail.value && selectedDetail.value.type === type && (selectedDetail.value.data.name === name || selectedDetail.value.data.label === name)) {
                selectedDetail.value = null;
            } else {
                selectedDetail.value = { type, data };
            }
        };

        // Timeline Data from Store
        const timelineSpans = computed(() => {
            if (!selectedDetail.value || !selectedDetail.value.data.spans) return [];

            // Determine bar color
            let barColor = '#737373';
            if (selectedDetail.value.type === 'Category' && selectedDetail.value.data.color) {
                barColor = selectedDetail.value.data.color;
            } else if (selectedDetail.value.type === 'Project' && selectedDetail.value.data.color) {
                barColor = selectedDetail.value.data.color;
            } else if (selectedDetail.value.type === 'App') {
                barColor = '#3b82f6';
            }

            return selectedDetail.value.data.spans.map(s => ({
                start: s.start_at,
                end: s.end_at,
                color: barColor,
                label: s.app_name + (s.window_title ? ' - ' + s.window_title : '')
            }));
        });

        // Current Range for Timeline
        const currentRange = computed(() => getRangeTimestamps());

        watch(selectedPeriod, () => {
            loadData();
        });

        onMounted(() => {
            loadData();
        });

        // Computed View Data from Store
        const overviewData = computed(() => {
            // Get the raw response data
            const raw = store.state;
            if (!raw) return null;

            const totalSeconds = raw.total_seconds || 0;
            if (totalSeconds === 0) return null;

            // Process apps
            const sortedApps = (raw.apps || [])
                .sort((a, b) => b.total_seconds - a.total_seconds)
                .slice(0, 5)
                .map(a => ({
                    name: a.name,
                    time: formatTime(a.total_seconds),
                    seconds: a.total_seconds,
                    percent: totalSeconds > 0 ? (a.total_seconds / totalSeconds) * 100 : 0,
                    spans: a.spans
                }));

            // Process projects
            const sortedProjects = (raw.projects || [])
                .sort((a, b) => b.total_seconds - a.total_seconds)
                .slice(0, 5)
                .map(p => ({
                    name: p.project.name,
                    color: p.project.color,
                    time: formatTime(p.total_seconds),
                    seconds: p.total_seconds,
                    percent: totalSeconds > 0 ? (p.total_seconds / totalSeconds) * 100 : 0,
                    spans: p.spans
                }));

            // Process categories for distribution
            const distribution = (raw.categories || [])
                .sort((a, b) => b.total_seconds - a.total_seconds)
                .map(c => ({
                    label: c.category.name,
                    color: c.category.color,
                    percent: totalSeconds > 0 ? Math.round((c.total_seconds / totalSeconds) * 100) : 0,
                    spans: c.spans
                }));

            return {
                totalTime: formatTime(totalSeconds),
                topApp: sortedApps.length > 0 ? sortedApps[0].name : '-',
                topProject: sortedProjects.length > 0 ? sortedProjects[0].name : '-',
                distribution,
                apps: sortedApps,
                projects: sortedProjects
            };
        });

        return {
            periods,
            selectedPeriod,
            referenceDate,
            dateRangeLabel,
            navigate,
            setToday,
            data: overviewData,
            isLoading: computed(() => store.state.isLoading),
            selectedDetail,
            selectDetail,
            timelineSpans,
            currentRange
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
                    <div class="flex items-center gap-6">
                        <!-- Date Navigation Controls -->
                        <div class="flex items-center bg-neutral-900 rounded-lg border border-neutral-800 p-0.5">
                            <button @click="navigate('prev')" class="p-1.5 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>

                            <div class="px-4 text-xs font-medium text-neutral-200 min-w-[200px] text-center select-none">
                                {{ dateRangeLabel }}
                            </div>

                            <button @click="navigate('next')" class="p-1.5 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>

                        <button @click="setToday" class="text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors">
                            Today
                        </button>
                    </div>

                    <!-- Period Toggle -->
                    <div class="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                        <button
                            v-for="period in periods"
                            :key="period"
                            @click="selectedPeriod = period"
                            :class="[
                                'px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                                selectedPeriod === period
                                    ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                            ]"
                        >
                            {{ period }}
                        </button>
                    </div>
                </header>

                <!-- Scrollable Content -->
                <div v-if="isLoading" class="flex-1 flex items-center justify-center">
                    <div class="text-neutral-500 text-sm">Loading...</div>
                </div>

                <div v-else-if="data" class="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div class="max-w-6xl mx-auto space-y-10 pb-20">

                        <!-- KPI Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/60 transition-colors">
                                <div class="text-neutral-500 text-xs uppercase tracking-wide font-semibold mb-2">Total Time</div>
                                <div class="text-3xl font-light text-neutral-100 tracking-tight">{{ data.totalTime }}</div>
                            </div>
                            <div class="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/60 transition-colors">
                                <div class="text-neutral-500 text-xs uppercase tracking-wide font-semibold mb-2">Top App</div>
                                <div class="text-xl font-normal text-neutral-200 truncate mt-1.5">{{ data.topApp }}</div>
                            </div>
                            <div class="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/60 transition-colors">
                                <div class="text-neutral-500 text-xs uppercase tracking-wide font-semibold mb-2">Top Project</div>
                                <div class="text-xl font-normal text-neutral-200 truncate mt-1.5">{{ data.topProject }}</div>
                            </div>
                        </div>

                        <!-- Visual Distribution Bar -->
                        <div v-if="data.distribution.length > 0">
                             <h3 class="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-4">Category Breakdown</h3>
                             <div class="h-6 w-full flex rounded-lg overflow-hidden ring-1 ring-neutral-800/50">
                                <div v-for="(item, idx) in data.distribution"
                                     :key="idx"
                                     :class="[
                                        'cursor-pointer transition-all duration-300 ease-out hover:brightness-110 relative',
                                        selectedDetail?.type === 'Category' && selectedDetail?.data.label === item.label ? 'ring-2 ring-white z-10 brightness-110' : ''
                                     ]"
                                     :style="{ width: item.percent + '%', backgroundColor: item.color }"
                                     @click="selectDetail('Category', item)"
                                     :title="item.label"
                                ></div>
                             </div>
                             <div class="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-xs font-medium text-neutral-500">
                                <div v-for="(item, idx) in data.distribution"
                                     :key="idx"
                                     class="flex items-center gap-2 cursor-pointer hover:text-neutral-300 transition-colors"
                                     @click="selectDetail('Category', item)"
                                >
                                    <div class="w-2.5 h-2.5 rounded-full ring-2 ring-neutral-950" :style="{ backgroundColor: item.color }"></div>
                                    <span :class="selectedDetail?.type === 'Category' && selectedDetail?.data.label === item.label ? 'text-white' : 'text-neutral-400'">
                                        {{ item.label }} <span class="text-neutral-600 ml-1">{{ item.percent }}%</span>
                                    </span>
                                </div>
                             </div>
                        </div>

                        <!-- Detailed Lists -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">

                            <!-- Apps List -->
                            <div class="bg-neutral-900/20 rounded-2xl border border-neutral-800/50 p-6">
                                <div class="flex items-center justify-between mb-6">
                                    <h3 class="text-sm font-semibold text-neutral-300">Applications</h3>
                                </div>
                                <div class="space-y-5">
                                    <div v-if="data.apps.length === 0" class="text-sm text-neutral-500">No activity recorded.</div>
                                    <div v-for="app in data.apps"
                                         :key="app.name"
                                         class="group cursor-pointer rounded-lg p-2 -m-2 transition-colors"
                                         :class="selectedDetail?.type === 'App' && selectedDetail?.data.name === app.name ? 'bg-neutral-800/60' : 'hover:bg-neutral-800/20'"
                                         @click="selectDetail('App', app)"
                                    >
                                        <div class="flex justify-between text-sm mb-2">
                                            <span class="font-medium" :class="selectedDetail?.type === 'App' && selectedDetail?.data.name === app.name ? 'text-white' : 'text-neutral-300'">{{ app.name }}</span>
                                            <span class="text-neutral-400 font-mono text-xs">{{ app.time }}</span>
                                        </div>
                                        <div class="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                            <div class="h-full rounded-full transition-colors"
                                                 :class="selectedDetail?.type === 'App' && selectedDetail?.data.name === app.name ? 'bg-white' : 'bg-neutral-400 group-hover:bg-neutral-300'"
                                                 :style="{ width: app.percent + '%' }"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Projects List -->
                            <div class="bg-neutral-900/20 rounded-2xl border border-neutral-800/50 p-6">
                                <div class="flex items-center justify-between mb-6">
                                    <h3 class="text-sm font-semibold text-neutral-300">Projects</h3>
                                </div>
                                <div class="space-y-4">
                                    <div v-if="data.projects.length === 0" class="text-sm text-neutral-500">No project activity.</div>
                                    <div v-for="proj in data.projects"
                                         :key="proj.name"
                                         class="p-3 -mx-3 rounded-lg transition-colors group cursor-pointer"
                                         :class="selectedDetail?.type === 'Project' && selectedDetail?.data.name === proj.name ? 'bg-neutral-800/60' : 'hover:bg-neutral-800/40'"
                                         @click="selectDetail('Project', proj)"
                                    >
                                        <div class="flex justify-between items-center mb-2">
                                            <div class="flex items-center gap-3">
                                                <div class="w-2 h-2 rounded-full transition-colors"
                                                     :style="{ backgroundColor: proj.color || '#737373' }"
                                                ></div>
                                                <span class="text-sm" :class="selectedDetail?.type === 'Project' && selectedDetail?.data.name === proj.name ? 'text-white' : 'text-neutral-200'">{{ proj.name }}</span>
                                            </div>
                                            <span class="text-neutral-500 text-xs font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">{{ proj.time }}</span>
                                        </div>
                                        <div class="w-full bg-neutral-800/50 h-1 rounded-full overflow-hidden ml-5" style="width: calc(100% - 1.25rem)">
                                            <div class="h-full"
                                                 :class="selectedDetail?.type === 'Project' && selectedDetail?.data.name === proj.name ? 'bg-white' : 'bg-neutral-600'"
                                                 :style="{ width: proj.percent + '%' }"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- Timeline View -->
                        <div v-if="selectedDetail" class="pt-6 border-t border-neutral-800/50">
                            <div class="flex items-center justify-between mb-6">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 rounded bg-neutral-800/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    </div>
                                    <div>
                                        <h3 class="text-sm font-semibold text-neutral-200">{{ selectedDetail.type }} Activity</h3>
                                        <div class="text-xs text-neutral-500">{{ selectedDetail.data.name || selectedDetail.data.label }}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="w-full h-48">
                                <DetailedTimeline
                                    :spans="timelineSpans"
                                    :range-start="currentRange.start"
                                    :range-end="currentRange.end"
                                />
                            </div>
                        </div>

                    </div>
                </div>

                <div v-else class="flex-1 flex items-center justify-center">
                    <div class="text-neutral-500 text-sm">No data available</div>
                </div>
            </main>
        </div>
    `
};
