import ElementComponent from '../components/element'
import useChildrenImpl from './use-children-impl'

export default function useChildren(
  props: Parameters<typeof useChildrenImpl>[0],
) {
  return useChildrenImpl(props, ElementComponent)
}
