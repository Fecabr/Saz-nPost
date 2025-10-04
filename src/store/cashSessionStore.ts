import { create } from 'zustand';

export interface CashSession {
  isOpen: boolean;
  initialAmount: number;
  currentAmount: number;
  openedAt: string | null;
  closedAt: string | null;
  sales: number;
  userEmail?: string;
}

interface CashSessionState {
  session: CashSession;
  openSession: (initialAmount: number) => void;
  closeSession: () => void;
  addSale: (amount: number) => void;
  resetSession: () => void;
}

const INITIAL_SESSION: CashSession = {
  isOpen: false,
  initialAmount: 0,
  currentAmount: 0,
  openedAt: null,
  closedAt: null,
  sales: 0,
};

export const useCashSessionStore = create<CashSessionState>((set) => ({
  session: INITIAL_SESSION,

  openSession: (initialAmount: number) =>
    set({
      session: {
        isOpen: true,
        initialAmount,
        currentAmount: initialAmount,
        openedAt: new Date().toISOString(),
        closedAt: null,
        sales: 0,
      },
    }),

  closeSession: () =>
    set((state) => ({
      session: {
        ...state.session,
        isOpen: false,
        closedAt: new Date().toISOString(),
      },
    })),

  addSale: (amount: number) =>
    set((state) => ({
      session: {
        ...state.session,
        currentAmount: state.session.currentAmount + amount,
        sales: state.session.sales + 1,
      },
    })),

  resetSession: () =>
    set({
      session: INITIAL_SESSION,
    }),
}));
