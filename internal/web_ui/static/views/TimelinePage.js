import { onMounted } from 'vue';
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

        // --- Lifecycle ---
        onMounted(async () => {
            await store.fetchData();
            store.scrollToNow();
        });

        return {
            PIXELS_PER_HOUR: store.PIXELS_PER_HOUR,
            totalWidth: store.totalWidth,
            hours: store.hours,
            appsWithActivities: store.appsWithActivities,
            selectedActivity: store.selectedActivity,
            detailsVisible: store.detailsVisible,
            showDetails: store.showDetails,
            searchQuery: store.searchQuery,
            toggleDetails: store.toggleDetails,
            isLoading: store.isLoading,
            selectActivity: store.selectActivity,
            getActivityStyle: store.getActivityStyle,
            dayMarkers: store.dayMarkers,
            currentTimePosition: store.currentTimePosition,
            startTime: store.startTime,
            endTime: store.endTime,
            formatDate: store.formatDate,
            getHourPosition: store.getHourPosition,
            shouldShowActivityTitle: store.shouldShowActivityTitle,
            getWindowGroupsForApp: store.getWindowGroupsForApp
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
                <!-- Header -->
                <TimelineHeader
                    :isLoading="isLoading"
                    :searchQuery="searchQuery"
                    @update:searchQuery="searchQuery = $event"
                    :showDetails="showDetails"
                    @toggleDetails="toggleDetails"
                />

                <!-- Timeline Wrapper -->
                <div class="flex-1 overflow-auto relative custom-scrollbar" id="timeline-scroll-area">
                    <div class="relative" :style="{ width: totalWidth + 'px', minHeight: '100%' }">

                        <!-- Ruler, Markers, Grid -->
                        <TimelineRuler
                            :hours="hours"
                            :dayMarkers="dayMarkers"
                            :currentTimePosition="currentTimePosition"
                            :pixelsPerHour="PIXELS_PER_HOUR"
                            :getHourPosition="getHourPosition"
                        />

                        <!-- App Rows -->
                        <div class="py-2 space-y-1 relative z-0">
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
