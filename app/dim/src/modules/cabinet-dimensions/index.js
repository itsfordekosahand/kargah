/**
 * نقطه ورودی ماژول cabinet-dimensions
 *
 * استفاده:
 *   import CabinetDimensions from '@/modules/cabinet-dimensions'
 *   app.use(CabinetDimensions)   // یا <CabinetDimensions />
 */
import { useCabinetStore } from './store/cabinet-store.js'
import CabinetCalculator from './ui/CabinetCalculator.vue'
import TemplatesManager from './management/TemplatesManager.vue'
import ConstantsManager from './management/ConstantsManager.vue'
import RuleExtractor from './management/RuleExtractor.vue'
import SampleInput from './management/SampleInput.vue'
import Styles from './styles/cabinet-dimensions.css?inline'

const CabinetDimensions = {
  name: 'CabinetDimensions',
  components: { CabinetCalculator, TemplatesManager, ConstantsManager, RuleExtractor, SampleInput },
  install(app) {
    if (typeof document !== 'undefined' && !document.getElementById('cabinet-dimensions-styles')) {
      const style = document.createElement('style')
      style.id = 'cabinet-dimensions-styles'
      style.textContent = Styles
      document.head.appendChild(style)
    }
    app.component('CabinetCalculator', CabinetCalculator)
    app.component('TemplatesManager', TemplatesManager)
    app.component('ConstantsManager', ConstantsManager)
    app.component('RuleExtractor', RuleExtractor)
    app.component('SampleInput', SampleInput)
  }
}

export default CabinetDimensions
export {
  CabinetCalculator,
  TemplatesManager,
  ConstantsManager,
  RuleExtractor,
  SampleInput,
  useCabinetStore
}

// لایه هسته (برای تست و استفاده مستقل)
export * from './core/formula-engine.js'
export * from './core/calculator.js'
export * from './core/rule-extractor.js'
export * from './core/validator.js'
export * from './core/constants.js'
export * from './core/templates.js'
export * from './core/instances.js'
export * from './config/variables.js'
export * from './config/defaults.js'
export * from './config/units.js'
