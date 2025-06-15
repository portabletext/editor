import {EditableForm} from '@/components/form/editable-form'
import {mockData} from './mock-data'
import '@/global.css'
import {ThemeDropdown} from '@/components/theme-dropdown'

export const App = () => {
  return (
    <>
      <ThemeDropdown />
      <EditableForm blockContent={mockData || []} />
    </>
  )
}
