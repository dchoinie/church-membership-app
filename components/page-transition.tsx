"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useRef } from "react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

function usePreviousValue<T>(value: T): T | undefined {
  const prevValue = useRef<T>();
  useEffect(() => {
    prevValue.current = value;
    return () => {
      prevValue.current = undefined;
    };
  });
  return prevValue.current;
}

function FrozenRouter(props: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const prevContext = usePreviousValue(context) ?? null;
  const path = usePathname();
  const prevPath = usePreviousValue(path);
  const changed =
    path !== prevPath &&
    path !== undefined &&
    prevPath !== undefined;

  return (
    <LayoutRouterContext.Provider value={changed ? prevContext : context}>
      {props.children}
    </LayoutRouterContext.Provider>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={path}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
