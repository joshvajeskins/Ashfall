import { useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { soundManager } from '@/game/effects/SoundManager';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

const shortcuts: ShortcutAction[] = [
  {
    key: 'i',
    action: () => useUIStore.getState().toggleInventory(),
    description: 'Toggle inventory'
  },
  {
    key: 'm',
    action: () => useUIStore.getState().toggleMinimap(),
    description: 'Toggle minimap'
  },
  {
    key: 's',
    action: () => useUIStore.getState().toggleStats(),
    description: 'Toggle stats'
  },
  {
    key: 'Escape',
    action: () => {
      const store = useUIStore.getState();
      if (store.activeModal) {
        store.closeModal();
        soundManager.play('menuClose');
      }
    },
    description: 'Close modal / menu'
  },
  {
    key: '/',
    shift: true,
    action: () => {
      console.log('Keyboard Shortcuts:');
      shortcuts.forEach((s) => {
        const modifiers = [
          s.ctrl && 'Ctrl',
          s.shift && 'Shift',
          s.alt && 'Alt'
        ]
          .filter(Boolean)
          .join('+');
        const keyCombo = modifiers ? `${modifiers}+${s.key}` : s.key;
        console.log(`  ${keyCombo}: ${s.description}`);
      });
    },
    description: 'Show keyboard shortcuts'
  }
];

export function useKeyboardShortcuts(enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = !!shortcut.ctrl === event.ctrlKey;
        const matchesShift = !!shortcut.shift === event.shiftKey;
        const matchesAlt = !!shortcut.alt === event.altKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function getShortcuts(): Array<{ key: string; description: string }> {
  return shortcuts.map((s) => {
    const modifiers = [
      s.ctrl && 'Ctrl',
      s.shift && 'Shift',
      s.alt && 'Alt'
    ]
      .filter(Boolean)
      .join('+');
    const keyCombo = modifiers ? `${modifiers}+${s.key}` : s.key.toUpperCase();
    return { key: keyCombo, description: s.description };
  });
}
