declare global {
  // eslint-disable-next-line no-var -- must be var for globalThis augmentation
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true
