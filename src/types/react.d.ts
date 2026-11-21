/* Minimal React 19 typings for this project (the @types/react package isn't available offline).
   Covers the hooks and APIs Melo uses; JSX element attributes are intentionally loose. */
declare module "react" {
  export type ReactNode = ReactElement | string | number | bigint | boolean | null | undefined | Iterable<ReactNode>;
  export interface ReactElement { type: unknown; props: unknown; key: string | null }
  export type Key = string | number;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export type Dispatch<A> = (value: A) => void;
  export interface RefObject<T> { current: T }
  export type Ref<T> = RefObject<T | null> | ((instance: T | null) => void) | null;
  export type FC<P = {}> = (props: P) => ReactNode;
  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };
  export type ComponentType<P = {}> = (props: P) => ReactNode;
  export interface SyntheticEvent<T = Element> { target: EventTarget & T; currentTarget: EventTarget & T; preventDefault(): void; stopPropagation(): void }
  export interface ChangeEvent<T = Element> extends SyntheticEvent<T> {}
  export interface FormEvent<T = Element> extends SyntheticEvent<T> {}
  export interface MouseEvent<T = Element> extends SyntheticEvent<T> { clientX: number; clientY: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number }
  export interface KeyboardEvent<T = Element> extends SyntheticEvent<T> { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }
  export interface ClipboardEvent<T = Element> extends SyntheticEvent<T> { clipboardData: DataTransfer }
  export interface FocusEvent<T = Element> extends SyntheticEvent<T> {}
  export interface CSSProperties { [k: string]: string | number | undefined }
  export interface Context<T> { Provider: FC<{ value: T; children?: ReactNode }> }

  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: never[]) => unknown>(fn: T, deps: readonly unknown[]): T;
  export function useRef<T>(initial: T): RefObject<T>;
  export function useRef<T>(initial: T | null): RefObject<T | null>;
  export function useContext<T>(ctx: Context<T>): T;
  export function createContext<T>(value: T): Context<T>;
  export function useId(): string;
  export function useSyncExternalStore<T>(subscribe: (cb: () => void) => () => void, get: () => T, getServer?: () => T): T;
  export function lazy<P>(load: () => Promise<{ default: ComponentType<P> }>): ComponentType<P>;
  export const Suspense: FC<{ fallback?: ReactNode; children?: ReactNode }>;
  export const Fragment: FC<{ children?: ReactNode }>;
  export const StrictMode: FC<{ children?: ReactNode }>;
}
declare module "react/jsx-runtime" {
  export const jsx: unknown; export const jsxs: unknown; export const Fragment: unknown;
}
declare module "react-dom" {
  import type { ReactNode } from "react";
  export function createPortal(children: ReactNode, container: Element): ReactNode;
}
declare module "react-dom/client" {
  import type { ReactNode } from "react";
  export function createRoot(el: Element): { render(node: ReactNode): void; unmount(): void };
}
declare namespace JSX {
  type Element = import("react").ReactElement;
  type ElementType = string | ((props: any) => import("react").ReactNode);
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes { key?: import("react").Key }
  interface DOMAttributes {
    [attr: string]: unknown;
    children?: import("react").ReactNode;
    ref?: ((el: any) => void) | { current: any } | null;
    onClick?: (e: import("react").MouseEvent<any>) => void;
    onDoubleClick?: (e: import("react").MouseEvent<any>) => void;
    onMouseDown?: (e: import("react").MouseEvent<any>) => void;
    onMouseEnter?: (e: import("react").MouseEvent<any>) => void;
    onMouseLeave?: (e: import("react").MouseEvent<any>) => void;
    onChange?: (e: import("react").ChangeEvent<any>) => void;
    onInput?: (e: import("react").ChangeEvent<any>) => void;
    onSubmit?: (e: import("react").FormEvent<any>) => void;
    onKeyDown?: (e: import("react").KeyboardEvent<any>) => void;
    onPaste?: (e: import("react").ClipboardEvent<any>) => void;
    onFocus?: (e: import("react").FocusEvent<any>) => void;
    onBlur?: (e: import("react").FocusEvent<any>) => void;
    onScroll?: (e: import("react").SyntheticEvent<any>) => void;
    onDragStart?: (e: import("react").SyntheticEvent<any>) => void;
    onDragOver?: (e: import("react").SyntheticEvent<any>) => void;
    onDrop?: (e: import("react").SyntheticEvent<any>) => void;
  }
  interface IntrinsicElements { [tag: string]: DOMAttributes }
}
