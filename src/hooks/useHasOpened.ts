import { useRef } from "react";

/**
 * Returns true once `open` has been true at least once, and stays true afterwards.
 * Lets a lazily loaded panel mount on first open and keep its state and close animation after that.
 */
export const useHasOpened = (open: boolean): boolean => {
    const hasOpened = useRef(open);
    if (open) hasOpened.current = true;
    return hasOpened.current;
};
