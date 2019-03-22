import { AnyAction, MiddlewareAPI, Dispatch, Middleware } from 'redux';
import { HistoryLocation } from '@reach/router';
import { match } from '@reach/router/es/lib/utils';
import shallowEqual from 'shallowequal';
import { ParsedQuery } from 'query-string';
import { connect } from 'react-redux';

import { IDLE, LOADING } from './const';
import { LensLike } from './lens';

export type MatchParams = {
  [key: string]: string | undefined;
};

export type DataProps<Data> = { data: Exclude<Data, typeof IDLE> };

export type StrictReducer<S, A> = (state: S, action: A) => S;

export abstract class BaseFetcher<State, Params extends {}, Data extends {}> {
  abstract get pattern(): string;
  abstract getLocation(state: State): HistoryLocation;
  abstract getQuery(state: State): ParsedQuery;

  abstract fetch(params: Params, api: MiddlewareAPI<Dispatch, State>): Promise<Data>;
  abstract getParams(state: State, params: MatchParams, query: ParsedQuery): Params;

  abstract dataLens: LensLike<State, typeof IDLE | typeof LOADING | Data>;
  abstract paramsLens: LensLike<State, Params | undefined>;

  abstract get triggerActions(): any[];

  abstract dispatchMergeState(store: MiddlewareAPI<Dispatch, State>, state: State): void;

  protected reducerTriggeredAction: AnyAction | null = null;
  protected reducerTriggeredParams: Params | null = null;

  isIdle(state: State, params: Params): boolean {
    if (this.dataLens.get()(state) === IDLE) {
      return true;
    }
    if (!shallowEqual(params, this.paramsLens.get()(state))) {
      return true;
    }
    return false;
  }

  setLoading(params: Params, state: State): State {
    const state_ = this.dataLens.set(LOADING)(state);
    return this.paramsLens.set(params)(state_);
  }

  pickAction(action: AnyAction, state: State): string | undefined {
    if (this.triggerActions.indexOf(action.type) !== -1) {
      return this.getLocation(state).pathname;
    }
    return undefined;
  }

  reducer: StrictReducer<State, AnyAction> = (state: State, action: AnyAction) => {
    const pathname = this.pickAction(action, state);
    if (pathname) {
      const matchResult = match(this.pattern, pathname);
      if (matchResult) {
        const query = this.getQuery(state);
        const params: Params = this.getParams(state, matchResult.params, query);
        if (this.isIdle(state, params)) {
          this.reducerTriggeredAction = action;
          this.reducerTriggeredParams = params;
          return this.setLoading(params, state);
        }
      }
    }
    return state;
  };

  mapStateToProps = (state: State) => {
    const data = this.dataLens.get()(state);
    if (data === IDLE) {
      throw new Error('inconsitent state');
    }
    return {
      data,
    } as { data: Data | typeof LOADING };
  };

  connect = connect(this.mapStateToProps);

  middleware: Middleware<{}, State> = store => next => action => {
    const res = next(action);
    if (action === this.reducerTriggeredAction && !!this.reducerTriggeredParams) {
      const params = this.reducerTriggeredParams;
      this.reducerTriggeredAction = null;
      this.reducerTriggeredParams = null;
      this.fetch(params, store).then(data => {
        const oldState = store.getState();
        if (shallowEqual(this.paramsLens.get()(oldState), params)) {
          this.dispatchMergeState(store, this.dataLens.set(data)(oldState));
        }
      });
    }
    return res;
  };
}
