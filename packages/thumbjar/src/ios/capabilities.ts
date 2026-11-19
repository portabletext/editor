export function safariCapabilities() {
  return {
    'platformName': 'iOS',
    'browserName': 'Safari',
    'appium:automationName': 'XCUITest',
    'appium:udid': process.env.UDID,
    'appium:platformVersion': process.env.IOS_VERSION,
    'appium:nativeWebTap': true,
    'appium:connectHardwareKeyboard': false,
    'appium:keyboardAutocorrection': true,
    'appium:keyboardPrediction': true,
    'appium:wdaLaunchTimeout': 900_000,
    'appium:newCommandTimeout': 300,
    'appium:safariIgnoreFraudWarning': true,
  } as WebdriverIO.Capabilities
}
