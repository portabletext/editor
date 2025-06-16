import {StyledButton} from '@/components/styled-button'
import {
  StyledDropdownMenu,
  StyledDropdownMenuContent,
  StyledDropdownMenuItem,
  StyledDropdownMenuTrigger,
} from '@/components/styled-dropdown-menu'
import {Theme, useTheme} from '@/components/theme-provider'
import {MoonIcon, SunIcon} from 'lucide-react'

export function ThemeDropdown() {
  const {setTheme} = useTheme()

  return (
    <StyledDropdownMenu>
      <StyledDropdownMenuTrigger asChild>
        <StyledButton variant="ghost" className="h-8 w-8 px-0 ml-2">
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </StyledButton>
      </StyledDropdownMenuTrigger>
      <StyledDropdownMenuContent align="end">
        <StyledDropdownMenuItem onClick={() => setTheme(Theme.Light)}>
          Light
        </StyledDropdownMenuItem>
        <StyledDropdownMenuItem onClick={() => setTheme(Theme.Dark)}>
          Dark
        </StyledDropdownMenuItem>
        <StyledDropdownMenuItem onClick={() => setTheme(Theme.System)}>
          System
        </StyledDropdownMenuItem>
      </StyledDropdownMenuContent>
    </StyledDropdownMenu>
  )
}
