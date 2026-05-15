/**
 * Phosphor outlined icons (regular weight).
 *
 * Lifted verbatim from github.com/phosphor-icons/core (MIT). Inlined to keep
 * the bundle minimal and avoid pulling phosphor-react as a dependency.
 */

import type {ReactNode} from 'react'

type IconProps = {
  size?: number
  className?: string
}

function Icon({
  size = 16,
  className,
  children,
}: IconProps & {children: ReactNode}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={className}
      role="presentation"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle
        cx="128"
        cy="128"
        r="56"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <line
        x1="128"
        y1="40"
        x2="128"
        y2="16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <line
        x1="64"
        y1="64"
        x2="48"
        y2="48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <line
        x1="64"
        y1="192"
        x2="48"
        y2="208"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <line
        x1="192"
        y1="64"
        x2="208"
        y2="48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <line
        x1="192"
        y1="192"
        x2="208"
        y2="208"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <line
        x1="40"
        y1="128"
        x2="16"
        y2="128"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <line
        x1="128"
        y1="216"
        x2="128"
        y2="240"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <line
        x1="216"
        y1="128"
        x2="240"
        y2="128"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="16"
      />
    </Icon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M108.11,28.11A96.09,96.09,0,0,0,227.89,147.89,96,96,0,1,1,108.11,28.11Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
    </Icon>
  )
}

export function DotsVerticalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="128" cy="128" r="12" fill="currentColor" />
      <circle cx="128" cy="60" r="12" fill="currentColor" />
      <circle cx="128" cy="196" r="12" fill="currentColor" />
    </Icon>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle
        cx="128"
        cy="128"
        r="96"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <path
        d="M120,120a8,8,0,0,1,8,8v40a8,8,0,0,0,8,8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <circle cx="124" cy="84" r="12" fill="currentColor" />
    </Icon>
  )
}

export function LightbulbIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <line
        x1="88"
        y1="232"
        x2="168"
        y2="232"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <path
        d="M78.7,167A79.87,79.87,0,0,1,48,104.45C47.76,61.09,82.72,25,126.07,24a80,80,0,0,1,51.34,142.9A24.3,24.3,0,0,0,168,186v6a8,8,0,0,1-8,8H96a8,8,0,0,1-8-8v-6A24.11,24.11,0,0,0,78.7,167Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <path
        d="M136,56c20,3.37,36.61,20,40,40"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
    </Icon>
  )
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M142.41,40.22l87.46,151.87C236,202.79,228.08,216,215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22C119.89,29.26,136.11,29.26,142.41,40.22Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <line
        x1="128"
        y1="144"
        x2="128"
        y2="104"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <circle cx="128" cy="180" r="12" fill="currentColor" />
    </Icon>
  )
}

export function WarningOctagonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <line
        x1="128"
        y1="136"
        x2="128"
        y2="80"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <path
        d="M164.45,32H91.55a8,8,0,0,0-5.66,2.34L34.34,85.89A8,8,0,0,0,32,91.55v72.9a8,8,0,0,0,2.34,5.66l51.55,51.55A8,8,0,0,0,91.55,224h72.9a8,8,0,0,0,5.66-2.34l51.55-51.55a8,8,0,0,0,2.34-5.66V91.55a8,8,0,0,0-2.34-5.66L170.11,34.34A8,8,0,0,0,164.45,32Z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="16"
      />
      <circle cx="128" cy="172" r="12" fill="currentColor" />
    </Icon>
  )
}

export function WarningCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle
        cx="128"
        cy="128"
        r="96"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="16"
      />
      <line
        x1="128"
        y1="136"
        x2="128"
        y2="80"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <circle cx="128" cy="172" r="12" fill="currentColor" />
    </Icon>
  )
}
