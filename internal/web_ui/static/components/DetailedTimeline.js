import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

export default {
    props: {
        spans: { type: Array, required: true }, // { start: seconds, end: seconds, color: string }
        rangeStart: { type: Number, required: true }, // seconds
        rangeEnd: { type: Number, required: true }    // seconds
    },
    setup(props) {
        const container = ref(null);
        const containerWidth = ref(100); // Default to avoid div by zero, updated on mount

        // View State (in seconds)
        const viewDuration = ref(props.rangeEnd - props.rangeStart);
        const viewStart = ref(props.rangeStart);

        // Resize Observer
        let resizeObserver = null;

        const updateWidth = () => {
            if (container.value) {
                containerWidth.value = container.value.clientWidth;
            }
        };

        // Reset view when range changes completely
        watch(() => [props.rangeStart, props.rangeEnd], ([newStart, newEnd]) => {
            viewStart.value = newStart;
            viewDuration.value = newEnd - newStart;
        });

        const clampView = () => {
            const maxDuration = props.rangeEnd - props.rangeStart;
            
            if (viewDuration.value > maxDuration) viewDuration.value = maxDuration;
            if (viewDuration.value < 60) viewDuration.value = 60; // Min zoom 1 minute

            if (viewStart.value < props.rangeStart) viewStart.value = props.rangeStart;
            if (viewStart.value + viewDuration.value > props.rangeEnd) viewStart.value = props.rangeEnd - viewDuration.value;
        };

        const pixelsPerSecond = computed(() => {
            return containerWidth.value / viewDuration.value;
        });

        const visibleSpans = computed(() => {
            const vStart = viewStart.value;
            const vEnd = vStart + viewDuration.value;
            const pps = pixelsPerSecond.value;

            // Filter spans that overlap with view
            return props.spans
                .filter(s => s.end > vStart && s.start < vEnd)
                .map(s => ({
                    left: (s.start - vStart) * pps,
                    width: Math.max((s.end - s.start) * pps, 1), // ensure at least 1px
                    color: s.color,
                    original: s
                }));
        });

        const markers = computed(() => {
            const vStart = viewStart.value;
            const vDur = viewDuration.value;
            const pps = pixelsPerSecond.value;
            
            // Dynamic Step Size
            // Aim for markers every ~100-150px
            const targetStepSeconds = 150 / pps;
            
            const steps = [
                60, 300, 900, 1800, 3600, // 1m, 5m, 15m, 30m, 1h
                7200, 14400, 21600, 43200, 86400, // 2h, 4h, 6h, 12h, 1d
                172800, 604800 // 2d, 1w
            ];
            
            let step = steps.find(s => s >= targetStepSeconds) || 86400;

            const markerList = [];
            const firstMarker = Math.ceil(vStart / step) * step;
            const end = vStart + vDur;

            for (let t = firstMarker; t < end; t += step) {
                const date = new Date(t * 1000);
                let label = '';
                let subLabel = '';

                if (step >= 86400) {
                     label = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
                     subLabel = date.toLocaleDateString(undefined, { month: 'short' });
                } else {
                     label = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
                     if (t === firstMarker || (date.getHours() === 0 && date.getMinutes() === 0)) {
                         subLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                     }
                }

                markerList.push({
                    left: (t - vStart) * pps,
                    label,
                    subLabel,
                    isMajor: (step < 86400 && date.getHours() === 0 && date.getMinutes() === 0)
                });
            }
            return markerList;
        });

        const onWheel = (e) => {
            e.preventDefault();

            // Check for horizontal scroll (pan) vs vertical scroll (zoom)
            // Some mice/trackpads send deltaX for horizontal.
            // Standard mouse wheel sends deltaY. 
            // We'll treat deltaY as Zoom, unless Shift is held (standard horiz scroll) or it's clearly a trackpad pan.

            const isZoom = !e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX);
            
            if (isZoom) {
                const zoomFactor = 1.04;
                const direction = e.deltaY > 0 ? 1 : -1; // deltaY > 0 is scrolling down (Zoom OUT)
                
                const oldDur = viewDuration.value;
                let newDur = direction > 0 ? oldDur * zoomFactor : oldDur / zoomFactor;

                // Mouse pivot
                const rect = container.value.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, mouseX / containerWidth.value));
                const mouseTime = viewStart.value + (oldDur * ratio);

                // Apply constraints to newDur first
                const maxDur = props.rangeEnd - props.rangeStart;
                if (newDur > maxDur) newDur = maxDur;
                if (newDur < 60) newDur = 60;

                // Calculate new start to keep mouseTime fixed
                let newStart = mouseTime - (newDur * ratio);
                
                // Correction if bounds hit
                if (newStart < props.rangeStart) newStart = props.rangeStart;
                if (newStart + newDur > props.rangeEnd) newStart = props.rangeEnd - newDur;

                viewDuration.value = newDur;
                viewStart.value = newStart;

            } else {
                // Pan
                // Use deltaX if available, otherwise deltaY (if shift held)
                let deltaPx = e.deltaX;
                if (e.shiftKey && deltaPx === 0) deltaPx = e.deltaY;
                
                // If pure deltaY pan (no shift), usually it's unwanted vertical scroll, but we are capturing it.
                // Let's support deltaY pan if it's not zoom mode?
                // Actually, if isZoom is false, we are here.
                
                const pps = pixelsPerSecond.value;
                const deltaSec = deltaPx / pps;
                
                let newStart = viewStart.value + deltaSec;
                
                // Clamp
                if (newStart < props.rangeStart) newStart = props.rangeStart;
                if (newStart + viewDuration.value > props.rangeEnd) newStart = props.rangeEnd - viewDuration.value;
                
                viewStart.value = newStart;
            }
        };

        onMounted(() => {
            updateWidth();
            resizeObserver = new ResizeObserver(updateWidth);
            if (container.value) resizeObserver.observe(container.value);
            
            // Initial view adjustment
            viewDuration.value = props.rangeEnd - props.rangeStart;
            viewStart.value = props.rangeStart;
        });

        onUnmounted(() => {
            if (resizeObserver) resizeObserver.disconnect();
        });

        const formatTooltipTime = (sec) => {
            return new Date(sec * 1000).toLocaleTimeString();
        };

        return {
            container,
            visibleSpans,
            markers,
            onWheel,
            formatTooltipTime
        };
    },
    template: `
        <div class="flex flex-col h-full w-full bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden select-none">
            <!-- Timeline Canvas -->
            <div ref="container" 
                 class="relative flex-1 w-full overflow-hidden cursor-crosshair"
                 @wheel="onWheel"
            >
                <!-- Grid Lines -->
                <div class="absolute inset-0 pointer-events-none">
                    <div v-for="(m, i) in markers" 
                         :key="'line'+i"
                         class="absolute top-0 bottom-0 border-l border-neutral-800/50"
                         :class="{ 'border-neutral-700': m.isMajor, 'border-dashed': !m.isMajor }"
                         :style="{ left: m.left + 'px' }"
                    ></div>
                </div>

                <!-- Spans -->
                <div class="absolute top-8 bottom-8 inset-x-0">
                    <div v-for="(span, i) in visibleSpans"
                         :key="'span'+i"
                         class="absolute h-full rounded min-w-[1px] opacity-80 hover:opacity-100 transition-opacity flex items-center px-2"
                         :style="{
                             left: span.left + 'px',
                             width: span.width + 'px',
                             backgroundColor: span.color
                         }"
                         :title="(span.original.label || '') + ' | ' + formatTooltipTime(span.original.start) + ' - ' + formatTooltipTime(span.original.end)"
                    >
                        <span v-if="span.width > 40 && span.original.label" class="text-xs text-white truncate font-medium">
                            {{ span.original.label }}
                        </span>
                    </div>
                </div>

                <!-- Labels -->
                <div class="absolute bottom-0 inset-x-0 h-6 pointer-events-none">
                    <div v-for="(m, i) in markers"
                         :key="'lbl'+i"
                         class="absolute bottom-1 text-[10px] font-mono text-neutral-500 transform -translate-x-1/2 whitespace-nowrap"
                         :class="{ 'text-neutral-300 font-semibold': m.isMajor }"
                         :style="{ left: m.left + 'px' }"
                    >
                        {{ m.label }}
                        <span v-if="m.subLabel" class="ml-1 opacity-60 text-[9px]">{{ m.subLabel }}</span>
                    </div>
                </div>
            </div>
            
            <!-- Controls / Hint -->
            <div class="h-6 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between px-3 text-[10px] text-neutral-500">
                <span>Scroll to Zoom • Drag/Shift+Scroll to Pan</span>
            </div>
        </div>
    `
};
