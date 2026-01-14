export default {
    props: {
        modelValue: {
            type: String,
            required: true
        }
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const availableColors = [
            '#ef4444', // red
            '#f97316', // orange
            '#f59e0b', // amber
            '#eab308', // yellow
            '#84cc16', // lime
            '#22c55e', // green
            '#10b981', // emerald
            '#14b8a6', // teal
            '#06b6d4', // cyan
            '#0ea5e9', // sky
            '#3b82f6', // blue
            '#6366f1', // indigo
            '#8b5cf6', // violet
            '#a855f7', // purple
            '#d946ef', // fuchsia
            '#ec4899', // pink
            '#f43f5e', // rose
            '#737373', // neutral
        ];

        const selectColor = (color) => {
            emit('update:modelValue', color);
        };

        return {
            availableColors,
            selectColor
        };
    },
    template: `
        <div class="flex flex-wrap gap-2">
            <button
                v-for="color in availableColors"
                :key="color"
                @click="selectColor(color)"
                class="w-7 h-7 rounded-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:ring-offset-2 focus:ring-offset-neutral-900 border-2"
                :class="modelValue === color ? 'border-neutral-100 scale-110' : 'border-neutral-800 opacity-70 hover:opacity-100'"
                :style="{ backgroundColor: color }"
            ></button>
        </div>
    `
};
