/**
 * @public
 */
export type StepDefinitionCallback<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
> = TParamA extends undefined
  ? (context: TContext) => Promise<void> | void
  : TParamB extends undefined
    ? (context: TContext, paramA: TParamA) => Promise<void> | void
    : TParamC extends undefined
      ? (
          context: TContext,
          paramA: TParamA,
          paramB: TParamB,
        ) => Promise<void> | void
      : (
          context: TContext,
          paramA: TParamA,
          paramB: TParamB,
          paramC: TParamC,
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
