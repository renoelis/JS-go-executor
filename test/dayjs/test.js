const dayjs = require('dayjs')
const relativeTime = require('dayjs/plugin/relativeTime')
const zhCN = require('dayjs/locale/zh-cn')

dayjs.extend(relativeTime)
dayjs.locale(zhCN)

console.log(dayjs().from(dayjs('2020-01-01')))
