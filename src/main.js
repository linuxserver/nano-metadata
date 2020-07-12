import Vue from 'vue'
import App from './App.vue'
import Notifications from 'vue-notification'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faClone, faSpinner, faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import vmodal from 'vue-js-modal'
Vue.use(vmodal)
Vue.use(Notifications)

library.add(faClone,faSpinner,faQuestionCircle,faGithub)

Vue.component('font-awesome-icon', FontAwesomeIcon)

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
