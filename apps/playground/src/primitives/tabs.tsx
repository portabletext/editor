import {
  Tab as RACTab,
  TabList as RACTabList,
  TabPanel as RACTabPanel,
  Tabs as RACTabs,
  type TabListProps,
  type TabPanelProps,
  type TabProps,
  type TabsProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {focusRing} from './utils'

const tabsStyles = tv({
  base: 'flex flex-col',
})

export function Tabs(props: TabsProps) {
  return (
    <RACTabs
      {...props}
      className={tabsStyles({className: props.className as string})}
    />
  )
}

const tabListStyles = tv({
  base: 'flex gap-1',
})

export function TabList<T extends object>(props: TabListProps<T>) {
  return (
    <RACTabList
      {...props}
      className={tabListStyles({className: props.className as string})}
    />
  )
}

const tabStyles = tv({
  extend: focusRing,
  base: 'px-2 py-1.5 text-xs font-medium cursor-pointer transition-colors duration-150 rounded',
  variants: {
    isSelected: {
      true: 'text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 shadow-sm',
      false:
        'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
    },
  },
})

export function Tab(props: TabProps) {
  return (
    <RACTab
      {...props}
      className={({isSelected, isFocusVisible}) =>
        tabStyles({
          isSelected,
          isFocusVisible,
          className: props.className as string,
        })
      }
    />
  )
}

const tabPanelStyles = tv({
  base: 'flex-1 min-h-0 outline-none',
})

export function TabPanel(props: TabPanelProps) {
  return (
    <RACTabPanel
      {...props}
      className={tabPanelStyles({className: props.className as string})}
    />
  )
}
