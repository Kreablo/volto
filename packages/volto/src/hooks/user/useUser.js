import { useEffect } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import jwtDecode from 'jwt-decode';
import { getUser } from '@plone/volto/actions/users/users';

const useUser = () => {
  const user = useSelector((state) => state.users.user);
  const userSessionLoaded = useSelector((state) => state.userSession.login.loaded, shallowEqual);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      async (disp, getState) => {
        const s = getState();
        const users = s.users;
        const user0 = users?.user;
        const userSession = s.userSession;
        if (userSession.login.loaded) {
          const userId = userSession.token ? jwtDecode(userSession.token).sub : '';
          if (userId && !user0?.id && users?.get.loading === false) {
            return await disp(getUser(userId));
          }
        }
        return {};
      }
    );
  }, [dispatch, userSessionLoaded, user]);

  return user;
};

export default useUser;
