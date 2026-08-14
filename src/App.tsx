import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from '@app/SessionProvider'
import { router } from '@app/router'

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
