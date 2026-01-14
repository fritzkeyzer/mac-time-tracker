import { ref, computed } from 'vue';

// Shared state across all instances
const PIXELS_PER_HOUR = 200;

const spans = ref([]);
const startTime = ref(null);
const endTime = ref(null);
const totalWidth = ref(0);
const dayMarkers = ref([]);
const selectedSpan = ref(null);
const detailsVisible = ref(false);
const showDetails = ref(false);
const searchQuery = ref("");
const isLoading = ref(true);
const dateRange = ref({
    from: null,
    to: null
});

export function useTimelineStore() {
    // --- Computed ---
    const currentTimePosition = computed(() => {
        if (!startTime.value) return 0;
        const now = new Date();
        return getHoursFromStart(now) * PIXELS_PER_HOUR;
    });

    const hours = computed(() => {
        if (!startTime.value || !endTime.value) return [];

        const h = [];
        const start = new Date(startTime.value);
        const end = new Date(endTime.value);

        // Generate hours from start to end
        const currentHour = new Date(start);
        currentHour.setMinutes(0, 0, 0);

        while (currentHour <= end) {
            h.push({
                time: new Date(currentHour),
                label: currentHour.getHours() + ':00'
            });
            currentHour.setHours(currentHour.getHours() + 1);
        }

        return h;
    });

    const filteredSpans = computed(() => {
        if (!searchQuery.value) return spans.value;

        const query = searchQuery.value.toLowerCase();
        return spans.value.filter(span => {
            const appMatches = span.span.app_name.toLowerCase().includes(query);
            const titleMatches = span.span.window_title.toLowerCase().includes(query);
            const categoryMatches = span.categories?.some(cat => cat.name.toLowerCase().includes(query));
            const projectMatches = span.projects?.some(proj => proj.name.toLowerCase().includes(query));
            return appMatches || titleMatches || categoryMatches || projectMatches;
        });
    });

    // Group spans by app_name for visualization
    const groupedSpans = computed(() => {
        const groups = new Map();

        filteredSpans.value.forEach(timelineSpan => {
            const appName = timelineSpan.span.app_name;
            if (!groups.has(appName)) {
                groups.set(appName, []);
            }
            groups.get(appName).push(timelineSpan);
        });

        // Convert to array and sort by first span start time
        return Array.from(groups.entries())
            .map(([appName, spans]) => ({
                appName,
                spans: spans.sort((a, b) => a.span.start_at - b.span.start_at)
            }))
            .sort((a, b) => {
                const aFirstStart = a.spans[0]?.span.start_at || 0;
                const bFirstStart = b.spans[0]?.span.start_at || 0;
                return aFirstStart - bFirstStart;
            });
    });

    // --- Methods ---
    function getHoursFromStart(timestamp) {
        if (!startTime.value) return 0;
        const start = new Date(startTime.value);
        const time = new Date(timestamp);
        return (time - start) / (1000 * 60 * 60); // Convert ms to hours
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const hrs = date.getHours();
        const mins = date.getMinutes();
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const displayHrs = hrs % 12 || 12;
        return `${displayHrs}:${mins.toString().padStart(2, '0')} ${ampm}`;
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function getDurationString(startTimeUnix, endTimeUnix) {
        const durationMs = (endTimeUnix - startTimeUnix) * 1000;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    function selectSpan(timelineSpan) {
        const span = timelineSpan.span;
        const startMs = span.start_at * 1000;
        const endMs = span.end_at * 1000;

        selectedSpan.value = {
            appName: span.app_name,
            windowTitle: span.window_title,
            timeRange: `${formatDate(startMs)} ${formatTime(startMs)} - ${formatTime(endMs)}`,
            duration: getDurationString(span.start_at, span.end_at),
            categories: timelineSpan.categories || [],
            projects: timelineSpan.projects || []
        };
        detailsVisible.value = true;
    }

    function getSpanStyle(span) {
        const startMs = span.start_at * 1000;
        const endMs = span.end_at * 1000;
        const left = getHoursFromStart(startMs) * PIXELS_PER_HOUR;
        const hoursWidth = getHoursFromStart(endMs) - getHoursFromStart(startMs);
        const width = hoursWidth * PIXELS_PER_HOUR;
        return {
            left: `${left}px`,
            width: `${Math.max(width, 2)}px`
        };
    }

    function getHourPosition(hourObj) {
        if (!startTime.value) return 0;
        return ((hourObj.time - startTime.value) / (1000 * 60 * 60)) * PIXELS_PER_HOUR;
    }

    function shouldShowSpanLabel(span) {
        const startMs = span.start_at * 1000;
        const endMs = span.end_at * 1000;
        const hoursWidth = getHoursFromStart(endMs) - getHoursFromStart(startMs);
        return hoursWidth * PIXELS_PER_HOUR > 40;
    }

    function toggleDetails() {
        showDetails.value = !showDetails.value;
    }

    function setDateRange(from, to) {
        dateRange.value = { from, to };
    }

    // --- Data Fetching ---
    async function fetchData(from = null, to = null) {
        try {
            isLoading.value = true;

            // Use provided date range or stored date range or defaults
            const requestBody = {
                from: from || dateRange.value.from || 0,
                to: to || dateRange.value.to || 0
            };

            const response = await fetch('/api/timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error('Failed to fetch timeline');

            const data = await response.json();

            // Process timeline spans
            if (data && data.spans && Array.isArray(data.spans)) {
                spans.value = data.spans;

                // Find earliest and latest times
                let earliestTime = null;
                let latestTime = null;

                data.spans.forEach(timelineSpan => {
                    const startMs = timelineSpan.span.start_at * 1000;
                    const endMs = timelineSpan.span.end_at * 1000;

                    if (!earliestTime || startMs < earliestTime) {
                        earliestTime = startMs;
                    }
                    if (!latestTime || endMs > latestTime) {
                        latestTime = endMs;
                    }
                });

                // Set time range with buffer
                const now = new Date().getTime();
                const bufferHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

                startTime.value = earliestTime ? new Date(earliestTime - bufferHours) : new Date(now - bufferHours);
                endTime.value = latestTime ? new Date(latestTime + bufferHours) : new Date(now + bufferHours);

                // Calculate total width
                const totalHours = (endTime.value - startTime.value) / (1000 * 60 * 60);
                totalWidth.value = totalHours * PIXELS_PER_HOUR;

                // Generate day markers
                const markers = [];
                const currentDay = new Date(startTime.value);
                currentDay.setHours(0, 0, 0, 0);
                currentDay.setDate(currentDay.getDate() + 1); // Start from the next day

                while (currentDay < endTime.value) {
                    markers.push({
                        time: new Date(currentDay),
                        position: getHoursFromStart(currentDay) * PIXELS_PER_HOUR,
                        label: currentDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    });
                    currentDay.setDate(currentDay.getDate() + 1);
                }
                dayMarkers.value = markers;
            } else {
                spans.value = [];
            }

        } catch (error) {
            console.error("Error loading timeline:", error);
            spans.value = [];
        } finally {
            isLoading.value = false;
        }
    }

    function scrollToNow() {
        const scrollArea = document.getElementById('timeline-scroll-area');
        if (scrollArea) {
            const now = new Date();
            const nowPosition = getHoursFromStart(now) * PIXELS_PER_HOUR;
            // Position "now" at 80% from the left (20% buffer on right)
            scrollArea.scrollLeft = nowPosition - (scrollArea.clientWidth * 0.8);
        }
    }

    return {
        // Constants
        PIXELS_PER_HOUR,

        // State
        spans,
        startTime,
        endTime,
        totalWidth,
        dayMarkers,
        selectedSpan,
        detailsVisible,
        showDetails,
        searchQuery,
        isLoading,
        dateRange,

        // Computed
        currentTimePosition,
        hours,
        filteredSpans,
        groupedSpans,

        // Methods
        getHoursFromStart,
        formatTime,
        formatDate,
        getDurationString,
        selectSpan,
        getSpanStyle,
        getHourPosition,
        shouldShowSpanLabel,
        toggleDetails,
        setDateRange,
        fetchData,
        scrollToNow
    };
}
