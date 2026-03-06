import { useState, useEffect } from 'react'

export function useLocalTime(timezone: string) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
        setTime(formatter.format(new Date()))
      } catch {
        setTime('--:--:--')
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [timezone])

  return time
}
