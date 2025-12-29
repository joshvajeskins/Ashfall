# UI Development Skill

## Purpose
Build React UI components for MoveRogue with dark theme, responsive design, and game-appropriate styling.

## Before Writing Any Code

### Step 1: Check Known Issues & Documentation

1. **Check `docs/issues/ui/README.md`** for known pitfalls
2. **Check shadcn/ui via Context7:** resolve library ID first, then fetch with your component topic

## Theme System

### Dark Theme Only
MoveRogue uses a dark fantasy theme. Never use light colors.

```css
:root {
  --background: 222.2 84% 4.9%;      /* Near black */
  --foreground: 210 40% 98%;          /* Off white */
  --card: 222.2 84% 8%;               /* Dark card */
  --card-foreground: 210 40% 98%;
  --primary: 0 72% 51%;               /* Blood red */
  --primary-foreground: 210 40% 98%;
  --secondary: 217.2 32.6% 17.5%;     /* Dark blue-gray */
  --muted: 217.2 32.6% 17.5%;
  --accent: 47 96% 53%;               /* Gold for legendary */
  --destructive: 0 62.8% 30.6%;       /* Dark red */
  --border: 217.2 32.6% 17.5%;
  --ring: 0 72% 51%;
}
```

### Rarity Colors
```css
.rarity-common { color: hsl(0 0% 70%); }      /* Gray */
.rarity-uncommon { color: hsl(120 40% 50%); } /* Green */
.rarity-rare { color: hsl(210 90% 60%); }     /* Blue */
.rarity-epic { color: hsl(280 80% 60%); }     /* Purple */
.rarity-legendary { color: hsl(47 96% 53%); } /* Gold */
```

## Component Patterns

### Game UI Panels
```tsx
interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function GamePanel({ title, children, className }: PanelProps) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg",
      "p-4 shadow-lg",
      className
    )}>
      <h2 className="text-lg font-bold text-foreground mb-3
                     border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
```

### Item Display
```tsx
interface ItemSlotProps {
  item: Item | null;
  onSelect?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ItemSlot({ item, onSelect, size = 'md' }: ItemSlotProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        sizeClasses[size],
        "bg-secondary border-2 rounded",
        "hover:border-primary transition-colors",
        item ? `border-${item.rarity.toLowerCase()}` : "border-border"
      )}
    >
      {item && (
        <img
          src={`/assets/items/${item.id}.png`}
          alt={item.name}
          className="w-full h-full object-contain"
        />
      )}
    </button>
  );
}
```

### Health/Resource Bars
```tsx
interface ResourceBarProps {
  current: number;
  max: number;
  color: 'health' | 'mana' | 'stamina';
}

export function ResourceBar({ current, max, color }: ResourceBarProps) {
  const percentage = (current / max) * 100;

  const colors = {
    health: 'bg-red-600',
    mana: 'bg-blue-600',
    stamina: 'bg-green-600'
  };

  return (
    <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
      <div
        className={cn("h-full transition-all", colors[color])}
        style={{ width: `${percentage}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center
                       text-xs font-bold text-white">
        {current}/{max}
      </span>
    </div>
  );
}
```

## Responsive Design

### Breakpoints
```typescript
// Mobile-first approach
const breakpoints = {
  sm: '640px',   // Tablets
  md: '768px',   // Small laptops
  lg: '1024px',  // Desktops
  xl: '1280px',  // Large screens
};
```

### Game Layout
```tsx
export function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile: Stack vertically */}
      {/* Desktop: Side panels with game center */}
      <div className="flex flex-col lg:flex-row">
        <aside className="lg:w-64 p-4">
          <CharacterPanel />
        </aside>

        <main className="flex-1">
          {children}
        </main>

        <aside className="lg:w-72 p-4">
          <InventoryPanel />
        </aside>
      </div>
    </div>
  );
}
```

## Animation System

### CSS Animations
```css
@keyframes item-glow {
  0%, 100% { box-shadow: 0 0 5px currentColor; }
  50% { box-shadow: 0 0 20px currentColor; }
}

@keyframes damage-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; filter: brightness(2); }
}

@keyframes loot-drop {
  0% { transform: translateY(-20px) scale(0); opacity: 0; }
  50% { transform: translateY(5px) scale(1.1); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
```

### Tailwind Animations
```tsx
// Legendary item glow
<div className="animate-pulse shadow-[0_0_15px_hsl(47,96%,53%)]">

// Damage taken
<div className="animate-[damage-flash_0.3s_ease-out]">

// New item drop
<div className="animate-[loot-drop_0.5s_ease-out]">
```

## Game-Specific Components

### Death Screen
```tsx
export function DeathScreen({ lostItems }: { lostItems: Item[] }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-destructive mb-4">
          YOU DIED
        </h1>
        <p className="text-muted-foreground mb-8">
          Your items have been lost forever...
        </p>
        <div className="flex gap-2 justify-center mb-8">
          {lostItems.map(item => (
            <ItemSlot key={item.id} item={item} size="sm" />
          ))}
        </div>
        <Button onClick={createNewCharacter}>
          Create New Character
        </Button>
      </div>
    </div>
  );
}
```

### Dungeon HUD
```tsx
export function DungeonHUD() {
  const { character, currentFloor } = useGame();

  return (
    <div className="fixed top-0 left-0 right-0 p-4 pointer-events-none">
      <div className="flex justify-between items-start">
        {/* Character status */}
        <div className="pointer-events-auto">
          <ResourceBar
            current={character.health}
            max={character.maxHealth}
            color="health"
          />
        </div>

        {/* Floor indicator */}
        <div className="bg-card px-4 py-2 rounded">
          Floor {currentFloor}
        </div>

        {/* Quick slots */}
        <div className="flex gap-2 pointer-events-auto">
          <ItemSlot item={potionSlot} size="sm" />
        </div>
      </div>
    </div>
  );
}
```

## File Size Limits

- Page components: 150 lines max
- UI components: 200 lines max
- Hooks: 200 lines max

When exceeding limits, extract into smaller components.

## Accessibility

- All interactive elements need keyboard support
- Use proper ARIA labels for game controls
- Ensure sufficient color contrast
- Support screen readers for menus (not game canvas)
