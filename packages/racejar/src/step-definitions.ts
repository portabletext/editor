/**
 * @public
 */
export type StepDefinitionCallbackParameters<
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
> = TParamA extends undefined
  ? []
  : TParamB extends undefined
    ? [TParamA]
    : TParamC extends undefined
      ? [TParamA, TParamB]
      : [TParamA, TParamB, TParamC]

/**
 * @public
 */
export type StepDefinitionCallback<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
> = (
  context: TContext,
  ...args: StepDefinitionCallbackParameters<TParamA, TParamB, TParamC>
) => Promise<void> | void

/**
 * @public
 */
export type StepDefinition<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
> = {
  type: 'Context' | 'Action' | 'Outcome'
  text: string
  callback: StepDefinitionCallback<TContext, TParamA, TParamB, TParamC>
}

/**
 * @public
 */
export function Given<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
>(
  text: string,
  callback: StepDefinitionCallback<TContext, TParamA, TParamB, TParamC>,
): StepDefinition<TContext, TParamA, TParamB, TParamC> {
  return {type: 'Context', text, callback}
}

/**
 * @public
 */
export function When<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
>(
  text: string,
  callback: StepDefinitionCallback<TContext, TParamA, TParamB, TParamC>,
): StepDefinition<TContext, TParamA, TParamB, TParamC> {
  return {type: 'Action', text, callback}
}

/**
 * @public
 */
export function Then<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
>(
  text: string,
  callback: StepDefinitionCallback<TContext, TParamA, TParamB, TParamC>,
): StepDefinition<TContext, TParamA, TParamB, TParamC> {
  return {type: 'Outcome', text, callback}
}
