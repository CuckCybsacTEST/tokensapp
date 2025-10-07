"use client";
import React, { createContext, useContext } from 'react';

export type PagerApi = {
  scrollTo: (index: number) => void;
  selected: number;
  setSelected: (i: number) => void;
};

const Ctx = createContext<PagerApi | null>(null);

export function usePager(){
  const v = useContext(Ctx);
  return v;
}

export function PagerProvider({ value, children }:{ value: PagerApi; children: React.ReactNode }){
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
