import fs from 'fs'
import createRollupConfig from '../../../.rollup/index.mjs'

export default createRollupConfig({
    external: ['@bugsnag/browser-performance']
})
