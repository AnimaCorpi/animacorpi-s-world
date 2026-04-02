import React from 'react';

export const MainRefContext = React.createContext(null);

export const MainRefProvider = ({ mainRef, children }) => {
  return (
    <MainRefContext.Provider value={mainRef}>
      {children}
    </MainRefContext.Provider>
  );
};