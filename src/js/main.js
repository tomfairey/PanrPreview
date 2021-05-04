import '../css/main.css';

import Vue from 'vue';

import App from '../components/App.vue';

(async () => {
    // Vue.config.devtools = true;
    // Vue.config.productionTip = false;
    new Vue({
        render: createElement => createElement(App)
    }).$mount('#app');
})();