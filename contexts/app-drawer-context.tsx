import React, { createContext, useContext, useState } from "react";

type AppDrawerContextType = {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const AppDrawerContext = createContext<AppDrawerContextType | undefined>(
  undefined,
);

export function AppDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <AppDrawerContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer }}>
      {children}
    </AppDrawerContext.Provider>
  );
}

export const useAppDrawer = () => {
  const context = useContext(AppDrawerContext);
  if (context === undefined) {
    throw new Error("useAppDrawer must be used within an AppDrawerProvider");
  }
  return context;
};
