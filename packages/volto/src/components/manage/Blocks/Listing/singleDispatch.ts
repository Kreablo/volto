import { Dispatch } from 'react';

const dispatched: Set<string> = new Set();

export const singleDispatch: <A>(dispatch: Dispatch<A>, action: A, actionid: string) => void = (dispatch, action, actionid) => {
  const didso = dispatched.has(actionid);
  if (!didso) {
    dispatch(action);
    dispatched.add(actionid);
  }
};
