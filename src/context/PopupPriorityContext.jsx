import { createContext, useContext, useMemo, useState } from "react";

const PopupPriorityContext = createContext({
  monthWelcomeBlocking: false,
  setMonthWelcomeBlocking: () => {},
});

export function PopupPriorityProvider({ children }) {
  const [monthWelcomeBlocking, setMonthWelcomeBlocking] = useState(false);
  const value = useMemo(
    () => ({ monthWelcomeBlocking, setMonthWelcomeBlocking }),
    [monthWelcomeBlocking]
  );
  return (
    <PopupPriorityContext.Provider value={value}>
      {children}
    </PopupPriorityContext.Provider>
  );
}

export function usePopupPriority() {
  return useContext(PopupPriorityContext);
}
