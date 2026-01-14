import { ref, computed, onMounted } from 'vue';
import Sidebar from '../components/Sidebar.js';
import TimelineHeader from '../components/TimelineHeader.js';
import TimelineRuler from '../components/TimelineRuler.js';
import AppRow from '../components/AppRow.js';
import { useTimelineStore } from '../stores/useTimelineStore.js';

export default {
    components: {
        Sidebar,
        TimelineHeader,
        TimelineRuler,
        AppRow
    },
    setup() {
        const store = useTimelineStore();

        // --- Date Range Logic ---
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
            // Scroll to appropriate position after data loads
            setTimeout(() => {
                if (rangeType.value === 'day' && isToday()) {
                    store.scrollToNow();
                }
            }, 100);
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

        const isToday = () => {
            const today = new Date();
            const current = currentDate.value;
            return rangeType.value === 'day' &&
                   current.getDate() === today.getDate() &&
                   current.getMonth() === today.getMonth() &&
                   current.getFullYear() === today.getFullYear();
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

        // --- App rows with activities mapped from groupedSpans ---
        const appsWithActivities = computed(() => {
            const grouped = store.groupedSpans.value || [];
            console.log('Grouped spans:', grouped.length);
            const result = grouped.map(group => {
                const app = {
                    id: group.appName,
                    name: group.appName,
                    activities: group.spans.map(ts => ts.span),
                    fullSpans: group.spans
                };
                console.log(`App ${app.name}: ${app.activities.length} activities`);
                if (app.activities.length > 0) {
                    const firstActivity = app.activities[0];
                    const style = store.getSpanStyle(firstActivity);
                    console.log(`  First activity style:`, style);
                }
                return app;
            });
            return result;
        });

        // --- Window grouping function for details view ---
        const getWindowGroupsForApp = (app) => {
            const windowMap = new Map();

            app.fullSpans.forEach(timelineSpan => {
                const windowTitle = timelineSpan.span.window_title || 'Untitled';
                if (!windowMap.has(windowTitle)) {
                    windowMap.set(windowTitle, []);
                }
                windowMap.get(windowTitle).push(timelineSpan.span);
            });

            return Array.from(windowMap.entries()).map(([name, spans]) => ({
                name,
                spans: spans.sort((a, b) => a.start_at - b.start_at)
            }));
        };

        // --- Activity selection handler ---
        const handleSelectActivity = (app, span, isWindow, windowName) => {
            // Find the full timelineSpan object that matches this span
            const timelineSpan = app.fullSpans.find(ts => ts.span.id === span.id);
            if (timelineSpan) {
                store.selectSpan(timelineSpan);
            }
        };

        // --- Lifecycle ---
        onMounted(async () => {
            console.log('TimelinePage mounted');
            await fetchDataForRange();
            console.log('Data fetched, spans:', store.spans.value?.length);
            console.log('Total width:', store.totalWidth.value);
            console.log('Hours:', store.hours.value?.length);
        });

        return {
            PIXELS_PER_HOUR: store.PIXELS_PER_HOUR,
            totalWidth: store.totalWidth,
            hours: store.hours,
            appsWithActivities,
            selectedActivity: store.selectedSpan,
            detailsVisible: store.detailsVisible,
            showDetails: store.showDetails,
            searchQuery: store.searchQuery,
            toggleDetails: store.toggleDetails,
            isLoading: store.isLoading,
            selectActivity: handleSelectActivity,
            getActivityStyle: store.getSpanStyle,
            dayMarkers: store.dayMarkers,
            currentTimePosition: store.currentTimePosition,
            startTime: store.startTime,
            endTime: store.endTime,
            formatDate: store.formatDate,
            getHourPosition: store.getHourPosition,
            shouldShowActivityTitle: store.shouldShowSpanLabel,
            getWindowGroupsForApp,
            // Date controls
            rangeType,
            setRangeType,
            goBack,
            goForward,
            goToToday,
            headerDate,
            isToday
        };
    },
    template: `
        <div class="flex h-full w-full bg-neutral-950 text-neutral-300 font-sans overflow-hidden">
            <!-- Sidebar -->
            <Sidebar
                :selectedActivity="selectedActivity"
                :detailsVisible="detailsVisible"
            />

            <!-- Main Content: Timeline -->
            <main class="flex-1 flex flex-col relative overflow-hidden bg-neutral-950">
                <!-- Header with Date Controls -->
                <header class="shrink-0 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 shadow-sm z-30">
                    <div class="px-6 py-4">
                        <!-- Controls Row -->
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-6">
                                <h1 class="text-xs font-semibold tracking-wide uppercase text-neutral-500">Timeline View</h1>

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

                        <!-- Date & Search Row -->
                        <div class="flex items-center justify-between">
                            <h2 class="text-xl font-medium text-white">{{ headerDate }}</h2>

                            <div class="flex items-center gap-3">
                                <div class="relative">
                                    <input
                                        v-model="searchQuery"
                                        type="text"
                                        placeholder="Filter activities..."
                                        class="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-blue-600 w-56 placeholder-neutral-600"
                                    />
                                    <div v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2 top-2 cursor-pointer text-neutral-500 hover:text-white leading-none">
                                        &times;
                                    </div>
                                </div>

                                <button
                                    @click="toggleDetails"
                                    class="px-3 py-1.5 text-xs rounded transition-colors border"
                                    :class="showDetails ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'"
                                >
                                    {{ showDetails ? 'Hide Windows' : 'Show Windows' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Timeline Wrapper -->
                <div class="flex-1 overflow-auto relative custom-scrollbar" id="timeline-scroll-area">
                    <!-- Loading State -->
                    <div v-if="isLoading && appsWithActivities.length === 0" class="absolute inset-0 flex items-center justify-center text-neutral-500">
                        Loading timeline data...
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="appsWithActivities.length === 0" class="absolute inset-0 flex items-center justify-center text-neutral-500">
                        No activity recorded for this period.
                    </div>

                    <!-- Timeline Content -->
                    <div v-else class="relative" :style="{ width: totalWidth + 'px', minHeight: '100%' }">
                        <!-- Ruler, Markers, Grid -->
                        <TimelineRuler
                            :hours="hours"
                            :dayMarkers="dayMarkers"
                            :currentTimePosition="currentTimePosition"
                            :pixelsPerHour="PIXELS_PER_HOUR"
                            :getHourPosition="getHourPosition"
                        />

                        <!-- App Rows -->
                        <div class="py-2 space-y-1 relative z-0 w-full">
                            <AppRow
                                v-for="app in appsWithActivities"
                                :key="app.id"
                                :app="app"
                                :showDetails="showDetails"
                                :getActivityStyle="getActivityStyle"
                                :shouldShowActivityTitle="shouldShowActivityTitle"
                                :getWindowGroupsForApp="getWindowGroupsForApp"
                                @selectActivity="selectActivity"
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `
};
