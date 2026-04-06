import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
};

export function DropdownMenu({ trigger, children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 160)
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="inline-flex" ref={containerRef}>
      <button ref={triggerRef} type="button" onClick={() => setOpen((prev) => !prev)}>
        {trigger}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: position.top, left: position.left }}
              className="fixed z-[100] min-w-40 rounded-sm border border-gray-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

type DropdownMenuItemProps = {
  onClick?: () => void;
  danger?: boolean;
  children: ReactNode;
};

export function DropdownMenuItem({ onClick, danger, children }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-slate-800",
        danger ? "text-red-600" : "text-gray-700 dark:text-slate-200"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
