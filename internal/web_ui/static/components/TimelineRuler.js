export default {
    props: {
        hours: {
            type: Array,
            required: true
        },
        dayMarkers: {
            type: Array,
            required: true
        },
        currentTimePosition: {
            type: Number,
            required: true
        },
        pixelsPerHour: {
            type: Number,
            required: true
        },
        getHourPosition: {
            type: Function,
            required: true
        }
    },
    template: `
        <div>
            <!-- Ruler -->
            <div class="sticky top-0 z-10 flex border-b border-neutral-800 bg-neutral-950 text-xs font-mono text-neutral-600 h-8 items-center">
                 <div v-for="(h, idx) in hours" :key="idx"
                      class="absolute top-0 bottom-0 flex items-center pl-2 border-l border-neutral-800"
                      :style="{ left: getHourPosition(h) + 'px', width: pixelsPerHour + 'px' }">
                      {{ h.label }}
                 </div>
            </div>

            <!-- Day Markers -->
            <div class="absolute inset-0 pointer-events-none">
                <div v-for="(marker, idx) in dayMarkers" :key="'day-'+idx"
                     class="absolute top-0 bottom-0 border-l-2 border-blue-500/30"
                     :style="{ left: marker.position + 'px' }">
                    <div class="sticky top-1 left-2 bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded font-medium z-10">
                        {{ marker.label }}
                    </div>
                </div>
            </div>

            <!-- Current Time Marker -->
            <div class="absolute inset-0 pointer-events-none">
                <div class="absolute top-0 bottom-0 border-l-2 border-red-500/60 z-20"
                     :style="{ left: currentTimePosition + 'px' }">
                    <div class="sticky top-1 left-2 bg-red-500/30 text-red-200 text-xs px-2 py-1 rounded font-medium z-10">
                        Now
                    </div>
                </div>
            </div>

            <!-- Grid -->
            <div class="absolute inset-0 pointer-events-none">
                <div v-for="(h, idx) in hours" :key="'grid-'+idx">
                    <div class="absolute top-0 bottom-0 border-l border-dashed border-neutral-800/50"
                         :style="{ left: getHourPosition(h) + 'px' }"></div>
                </div>
            </div>
        </div>
    `
};
