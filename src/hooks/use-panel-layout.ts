'use client';

import { useSyncExternalStore } from 'react';

const CHAT_KEY = 'panel-chat-collapsed';
const CANVAS_KEY = 'panel-canvas-collapsed';

// Module-level subscriber set — shared across all hook instances
const subscribers = new Set<() => void>();

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => { subscribers.delete(callback); };
}

function notifyAll() {
  subscribers.forEach((cb) => cb());
}

function getChatSnapshot(): boolean {
  return localStorage.getItem(CHAT_KEY) === 'true';
}

function getCanvasSnapshot(): boolean {
  return localStorage.getItem(CANVAS_KEY) === 'true';
}

function getServerSnapshot(): boolean {
  return false;
}

export function setChatCollapsed(value: boolean) {
  localStorage.setItem(CHAT_KEY, String(value));
  notifyAll();
}

export function setCanvasCollapsed(value: boolean) {
  localStorage.setItem(CANVAS_KEY, String(value));
  notifyAll();
}

/**
 * Shared panel collapse state for chat and canvas panels.
 *
 * Uses useSyncExternalStore so ALL components calling this hook
 * see the same value and re-render together when it changes.
 * Two separate subscriptions (primitives) avoid Object.is re-render traps.
 *
 * State persists to localStorage and survives page refresh / step navigation.
 */
export function usePanelLayout() {
  const chatCollapsed = useSyncExternalStore(subscribe, getChatSnapshot, getServerSnapshot);
  const canvasCollapsed = useSyncExternalStore(subscribe, getCanvasSnapshot, getServerSnapshot);

  return { chatCollapsed, canvasCollapsed, setChatCollapsed, setCanvasCollapsed };
}
