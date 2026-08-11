import dayjs from 'dayjs'
import 'dayjs/locale/es'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.locale('es')
dayjs.tz.setDefault('America/Lima')

export default dayjs
