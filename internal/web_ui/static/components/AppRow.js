export default {
    props: {
        app: {
            type: Object,
            required: true
        },
        showDetails: {
            type: Boolean,
            default: false
        },
        getActivityStyle: {
            type: Function,
            required: true
        },
        shouldShowActivityTitle: {
            type: Function,
            required: true
        },
        getWindowGroupsForApp: {
            type: Function,
            required: true
        },
        groupColor: {
            type: String,
            default: null
        }
    },
    emits: ['selectActivity'],
    methods: {
        handleAppSpanClick(appSpan) {
            this.$emit('selectActivity', this.app, appSpan, false);
        },
        handleWindowSpanClick(winSpan, windowName) {
            this.$emit('selectActivity', this.app, winSpan, true, windowName);
        }
    },
    template: `
        <!-- App Row -->
        <div :class="showDetails ? 'h-12' : 'h-12'"
             class="relative flex items-center border-b border-neutral-800/50 hover:bg-neutral-900/30 transition-all group w-full">

            <!-- Sticky Label -->
            <div class="sticky left-0 z-30 w-48 pl-4 pr-2 bg-neutral-950/80 backdrop-blur border-r border-neutral-800 flex items-center gap-2 text-xs font-medium text-neutral-500 group-hover:text-neutral-300 transition-colors"
                :class="showDetails ? 'h-12' : 'h-12'"
            >
                <span class="w-2 h-2 rounded-full" :style="groupColor ? {backgroundColor: groupColor} : {}" :class="!groupColor ? 'bg-neutral-700' : ''"></span> {{ app.name }}
            </div>

            <!-- App Spans (multiple gray segments) -->
            <div v-for="(appSpan, spanIdx) in app.activities" :key="'app-span-'+spanIdx"
                 class="absolute h-8 top-2 rounded-sm border border-opacity-50 text-[10px] px-2 flex items-center truncate cursor-pointer hover:text-white hover:z-40 hover:shadow-lg transition-all select-none z-10"
                 :class="!groupColor ? 'bg-neutral-700 border-neutral-600 text-neutral-300 hover:border-neutral-400' : 'text-white'"
                 :style="Object.assign({}, getActivityStyle(appSpan), groupColor ? {backgroundColor: groupColor + 'CC', borderColor: groupColor} : {})"
                 @mouseenter="handleAppSpanClick(appSpan)"
            >
                <span v-if="shouldShowActivityTitle(appSpan)">{{ app.name }}</span>
            </div>
        </div>

        <!-- Window Rows (shown when details is enabled) -->
        <template v-if="showDetails">
            <div v-for="(window, winIdx) in getWindowGroupsForApp(app)" :key="'win-group-'+winIdx"
                 class="h-12 relative flex items-center border-b border-neutral-800/50 hover:bg-neutral-900/30 transition-all group w-full">

                <!-- Sticky Window Label -->
                <div class="sticky left-0 z-30 w-48 pl-8 pr-2 bg-neutral-950/80 backdrop-blur border-r border-neutral-800 flex items-center gap-2 text-xs font-medium text-blue-400 group-hover:text-blue-300 transition-colors"
                     :class="showDetails ? 'h-12' : 'h-12'"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span> {{ window.name }}
                </div>

                <!-- Window Spans (multiple blue outlined segments) -->
                <div v-for="(winSpan, spanIdx) in window.spans" :key="'win-span-'+spanIdx"
                     class="absolute h-8 top-2 rounded-sm border border-opacity-50 text-[10px] text-blue-300 px-2 flex items-center truncate cursor-pointer hover:text-white hover:z-40 hover:shadow-lg hover:border-blue-400 transition-all select-none bg-blue-900/30 border-blue-700 z-10"
                     :style="getActivityStyle(winSpan)"
                     @mouseenter="handleWindowSpanClick(winSpan, window.name)"
                >
                    <span v-if="shouldShowActivityTitle(winSpan)">{{ window.name }}</span>
                </div>
            </div>
        </template>
    `
};
