import {createApp} from 'vue';
import {createRouter, createWebHashHistory, RouterView} from 'vue-router';
import TimelineView from "./views/TimelinePage.js";
import ListView from "./views/ListPage.js";
import HomeView from "./views/OverviewPage.js";
import ConfigView from "./views/ConfigurationPage.js";

const routes = [
    {path: '/', component: HomeView},
    {path: '/timeline', component: TimelineView},
    {path: '/list', component: ListView},
    {path: '/config', component: ConfigView},
];

const router = createRouter({
    // Hash mode is safest for CLI tools (no server config needed for deep links)
    history: createWebHashHistory(),
    routes,
});

const App = {
    components: {RouterView},
    template: `
        <RouterView class="h-full w-full"></RouterView>
    `
};

// Mount
const app = createApp(App);
app.use(router);
app.mount('#app');