'use client';

import { useSyncExternalStore } from 'react';

const CHAT_KEY = 'panel-chat-collapsed';
const CHAT_WIDTH_KEY = 'panel-chat-width';

/** Chat column width bounds (px) for drag-to-resize. */
export const CHAT_WIDTH_MIN = 320;
export const CHAT_WIDTH_MAX = 720;
export const CHAT_WIDTH_DEFAULT = 400;

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

function getServerSnapshot(): boolean {
  return false;
}

export function clampChatWidth(value: number): number {
  if (!Number.isFinite(value)) return CHAT_WIDTH_DEFAULT;
  return Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, Math.round(value)));
}

function getChatWidthSnapshot(): number {
  const stored = Number(localStorage.getItem(CHAT_WIDTH_KEY));
  return stored ? clampChatWidth(stored) : CHAT_WIDTH_DEFAULT;
}

function getWidthServerSnapshot(): number {
  return CHAT_WIDTH_DEFAULT;
}

export function setChatCollapsed(value: boolean) {
  localStorage.setItem(CHAT_KEY, String(value));
  notifyAll();
}

export function setChatWidth(value: number) {
  localStorage.setItem(CHAT_WIDTH_KEY, String(clampChatWidth(value)));
  notifyAll();
}

/**
 * Shared panel layout state for the chat panel (collapse + width).
 *
 * Uses useSyncExternalStore so ALL components calling this hook
 * see the same value and re-render together when it changes.
 *
 * State persists to localStorage and survives page refresh / step navigation.
 */
export function usePanelLayout() {
  const chatCollapsed = useSyncExternalStore(subscribe, getChatSnapshot, getServerSnapshot);
  const chatWidth = useSyncExternalStore(subscribe, getChatWidthSnapshot, getWidthServerSnapshot);

  return { chatCollapsed, setChatCollapsed, chatWidth, setChatWidth };
}
