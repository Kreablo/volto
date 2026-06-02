/**
 * Search actions.
 * @module actions/search/search
 */

import compact from 'lodash/compact';
import concat from 'lodash/concat';
import isArray from 'lodash/isArray';
import join from 'lodash/join';
import map from 'lodash/map';
import pickBy from 'lodash/pickBy';
import toPairs from 'lodash/toPairs';
import { LRUCache } from 'lru-cache';
import { Action } from 'redux';
import {
  RESET_SEARCH_CONTENT,
  SEARCH_CONTENT,
} from '@plone/volto/constants/ActionTypes';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';
import { flattenToAppURL } from '../../helpers';

const _request_cache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 5,
});

const _no_cache: (querystring: string) => boolean = (querystring) => {
  try {
    const query = new URLSearchParams(querystring);
    return query.get('sort_on') === 'getObjPositionInParent';
  } catch (e) {
    return true;
  }
  return false;
};

/**
 * Search content function.
 * @function searchContent
 * @param {string} url Url to use as base.
 * @param {Object} options Search options.
 * @param {string} subrequest Key of the subrequest.
 * @returns {Object} Search content action.
 */
export function searchContent(url: string, options: Record<string, any>, subrequest: string | null = null): ThunkAction<Promise<any>, any, any, Action> {
  let queryArray: string[] = [];
  options = pickBy(
    options,
    (value) => value !== undefined && value !== null && value !== '',
  );
  const arrayOptions = pickBy(options, (item) => isArray(item));

  queryArray = concat(
    queryArray,
    options
      ? join(
        map(toPairs(pickBy(options, (item) => !isArray(item))), (item) => {
          return join(item, '=');
        }),
        '&',
      )
      : '',
  );

  queryArray = concat(
    queryArray,
    arrayOptions
      ? join(
        map(pickBy(arrayOptions), (item, key) =>
          join(
            item.map((value) => `${key}:list=${value}`),
            '&',
          ),
        ),
        '&',
      )
      : '',
  );

  const querystring = join(compact(queryArray), '&');

  return (dispatch: (action: any) => Promise<any>, _getState) => {
    const key = querystring;
    const value = _no_cache(key) ? undefined : _request_cache.get(key) as { items: any[], items_total: number, batching: any } | undefined;
    if (value !== undefined) {
      return dispatch({
        type: `${SEARCH_CONTENT}_SUCCESS`,
        subrequest,
        result: { ...value },
      });
    }
    return dispatch({
      type: SEARCH_CONTENT,
      subrequest,
      request: {
        op: 'get',
        path: `${url}/@search${querystring ? `?${querystring}` : ''}`,
      },
    }).then((result: { items: any[], items_total: number, batching: any }) => {
      _request_cache.set(key, { ...result });
      return result;
    });
  };
}

/**
 * Reset search content function.
 * @function resetSearchContent
 * @param {string} subrequest Key of the subrequest.
 * @returns {Object} Search content action.
 */
export function resetSearchContent(subrequest = null) {
  return {
    type: RESET_SEARCH_CONTENT,
    subrequest,
  };
}
