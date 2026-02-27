import { createApp } from 'vue'
import VueFeather from 'vue-feather'
import App from './App.vue'
import store from './store'
import router from './router'
import { applyAnimationsDisabled, loadAnimationsDisabled } from './lib/animationPrefs'
import './main.css'

applyAnimationsDisabled(loadAnimationsDisabled())

const app = createApp(App)

app.component(VueFeather.name, VueFeather)
app.use(store)
app.use(router)
app.mount('#app')
