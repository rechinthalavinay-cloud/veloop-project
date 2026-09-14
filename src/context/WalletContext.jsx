import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "veloop-wallet-v1";

const defaultWallet = {
  tokens: 20,
  gameCoins: 40,
  ves: 0,
  sves: 0,
  gems: 0,
  spins: 0,
  redemptions: [],
  withdrawals: [],
  claimedSessions: {},
  seenGuides: {},
};

const loadWallet = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWallet;
    return { ...defaultWallet, ...JSON.parse(raw) };
  } catch {
    return defaultWallet;
  }
};

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(loadWallet);

  const persist = useCallback((updater) => {
    setWallet((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const spendTokens = useCallback(
    (amount) => {
      let success = false;
      persist((current) => {
        if (current.tokens < amount) return current;
        success = true;
        return { ...current, tokens: current.tokens - amount };
      });
      return success;
    },
    [persist],
  );

  const addGameCoins = useCallback(
    (amount) => {
      persist((current) => ({
        ...current,
        gameCoins: current.gameCoins + amount,
      }));
    },
    [persist],
  );

  const markGuideSeen = useCallback(
    (slug) => {
      persist((current) => ({
        ...current,
        seenGuides: { ...current.seenGuides, [slug]: true },
      }));
    },
    [persist],
  );

  const redeem = useCallback(
    (offer) => {
      let result = { ok: false, reason: "unknown" };
      persist((current) => {
        const costKey = offer.costKey || "gameCoins";
        if (current[costKey] < offer.cost) {
          result = { ok: false, reason: "insufficient" };
          return current;
        }
        result = { ok: true };
        const label = `${offer.cost} ${offer.costLabel || "Game Coins"} → ${offer.reward} ${offer.rewardLabel}`;
        return {
          ...current,
          [costKey]: current[costKey] - offer.cost,
          [offer.rewardKey]: current[offer.rewardKey] + offer.reward,
          redemptions: [
            {
              id: crypto.randomUUID(),
              offerId: offer.id,
              cost: offer.cost,
              reward: offer.reward,
              label,
              at: new Date().toISOString(),
            },
            ...current.redemptions,
          ].slice(0, 20),
        };
      });
      return result;
    },
    [persist],
  );

  const claimSession = useCallback(
    (session) => {
      const today = new Date().toISOString().slice(0, 10);
      let result = { ok: false, reason: "unknown" };
      persist((current) => {
        const claimed = current.claimedSessions[session.id];
        
        if (session.id === "weekly") {
           if (claimed) {
             const claimedDate = new Date(claimed);
             const now = new Date(today);
             const daysSince = (now - claimedDate) / (1000 * 60 * 60 * 24);
             if (daysSince < 7) {
               result = { ok: false, reason: "already" };
               return current;
             }
           }
        } else {
          if (claimed === today) {
            result = { ok: false, reason: "already" };
            return current;
          }
        }

        result = { ok: true };
        const next = { ...current, claimedSessions: { ...current.claimedSessions, [session.id]: today } };
        Object.entries(session.reward).forEach(([key, value]) => {
          next[key] = (next[key] || 0) + value;
        });
        return next;
      });
      return result;
    },
    [persist],
  );

  const withdrawVes = useCallback(
    ({ amount, method, destination }) => {
      let result = { ok: false, reason: "unknown" };
      persist((current) => {
        if (amount < 50) {
          result = { ok: false, reason: "minimum" };
          return current;
        }
        if (current.ves < amount) {
          result = { ok: false, reason: "insufficient" };
          return current;
        }
        result = { ok: true };
        return {
          ...current,
          ves: current.ves - amount,
          withdrawals: [
            {
              id: crypto.randomUUID(),
              amount,
              method,
              destination,
              status: "Processing",
              inr: amount,
              at: new Date().toISOString(),
            },
            ...current.withdrawals,
          ].slice(0, 20),
        };
      });
      return result;
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      wallet,
      spendTokens,
      addGameCoins,
      markGuideSeen,
      redeem,
      claimSession,
      withdrawVes,
    }),
    [wallet, spendTokens, addGameCoins, markGuideSeen, redeem, claimSession, withdrawVes],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
