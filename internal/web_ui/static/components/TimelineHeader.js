export default {
    props: {
        isLoading: {
            type: Boolean,
            default: false
        },
        searchQuery: {
            type: String,
            default: ''
        },
        showDetails: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:searchQuery', 'toggleDetails'],
    template: `
        <header class="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950/80 backdrop-blur z-10">
            <div class="flex items-center gap-4">
                <span class="font-medium text-neutral-200">Today</span>
            </div>
            <div class="flex gap-3 items-center">
                <div class="text-xs text-neutral-500" v-if="isLoading">Loading...</div>

                <div class="relative">
                    <input
                        :value="searchQuery"
                        @input="$emit('update:searchQuery', $event.target.value)"
                        type="text"
                        placeholder="Filter..."
                        class="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-600 w-48 placeholder-neutral-600"
                    />
                    <div v-if="searchQuery" @click="$emit('update:searchQuery', '')" class="absolute right-2 top-1.5 cursor-pointer text-neutral-500 hover:text-white leading-none">
                        &times;
                    </div>
                </div>

                <button
                    @click="$emit('toggleDetails')"
                    class="px-3 py-1 text-xs rounded transition-colors border"
                    :class="showDetails ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'"
                >
                    {{ showDetails ? 'Hide Details' : 'Show Details' }}
                </button>
            </div>
        </header>
    `
};
