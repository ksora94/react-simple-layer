# react-simple-layer
A simple way to create a react layer.

## Install

```bash
npm install react-simple-layer
```

## Quick Start

### 1. Register LayerRoot in your app

First, you need to add `LayerRoot` component to your application root:

```tsx
import React from 'react';
import { LayerRoot } from 'react-simple-layer';

function App() {
  return (
    <div>
      {/* Your app content */}
      <YourComponents />
      
      {/* LayerRoot should be placed at the end */}
      <LayerRoot />
    </div>
  );
}
```

### 2. Create and use layers

```tsx
import { createLayer, LC } from 'react-simple-layer';

// Define your layer component
const Modal: LC<{ title: string; content: string }> = ({ title, content, layer }) => {
  return (
    <div className="modal">
      <h1>{title}</h1>
      <p>{content}</p>
      <button onClick={layer.destroy}>Close</button>
    </div>
  );
};

// Create layer instance
const modalLayer = createLayer(Modal);

// Render the layer
modalLayer.render({
  title: 'Hello',
  content: 'This is a modal!'
});

// Destroy when needed
// modalLayer.destroy();
```

## API Reference

### `LayerRoot`

The root component that renders all layers. Must be placed in your app to enable layer functionality.

#### Props

- `root?: string` - The ID of the DOM element to render layers into. Default: `'layer-root'`

#### Example

```tsx
// Use default root
<LayerRoot />

// Use custom root ID
<LayerRoot root="my-custom-root" />
```

### `createLayer`

```typescript
function createLayer<P>(Component: LC<P>, key?: string): LayerInstance<P>
```

Creates a layer instance from a component.

#### Parameters

- `Component: LC<P>` - The layer component. It receives props of type `P` and a special `layer` prop.
- `key?: string` - Optional unique key for the layer. If not provided, a random key will be generated.

#### Returns

Returns a `LayerInstance<P>` object with the following properties:

- `layer: Layer` - The layer object containing:
  - `key: string` - Unique identifier for the layer
  - `component: FC<P>` - The wrapped component
  - `destroy(): void` - Method to destroy this layer

- `render(props?: Omit<P, 'layer'>): void` - Renders the layer with the given props

- `destroy(): void` - Removes the layer from the DOM

### `LC<P>`

Type definition for layer components.

```typescript
type LC<P> = FC<P & { layer: Layer }>
```

Your component receives:
- All props of type `P`
- A special `layer` prop with `key`, `component`, and `destroy()` method

## Examples

### Modal Dialog

```tsx
import { createLayer, LC, LayerRoot } from 'react-simple-layer';

const Modal: LC<{ title: string; onConfirm: () => void }> = ({ 
  title, 
  onConfirm, 
  layer 
}) => {
  const handleConfirm = () => {
    onConfirm();
    layer.destroy();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{title}</h2>
        <button onClick={handleConfirm}>Confirm</button>
        <button onClick={layer.destroy}>Cancel</button>
      </div>
    </div>
  );
};

const modalLayer = createLayer(Modal);

// Use in your app
function MyApp() {
  const showModal = () => {
    modalLayer.render({
      title: 'Confirm Action',
      onConfirm: () => console.log('Confirmed!')
    });
  };

  return (
    <div>
      <button onClick={showModal}>Open Modal</button>
      <LayerRoot />
    </div>
  );
}
```

### Toast Notification

```tsx
const Toast: LC<{ message: string; type: 'success' | 'error' }> = ({ 
  message, 
  type, 
  layer 
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      layer.destroy();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast toast-${type}`}>
      {message}
      <button onClick={layer.destroy}>×</button>
    </div>
  );
};

const toastLayer = createLayer(Toast);

// Show toast
toastLayer.render({
  message: 'Success!',
  type: 'success'
});
```

### Drawer

```tsx
const Drawer: LC<{ children: React.ReactNode }> = ({ children, layer }) => {
  return (
    <div className="drawer-overlay" onClick={layer.destroy}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={layer.destroy}>×</button>
        {children}
      </div>
    </div>
  );
};

const drawerLayer = createLayer(Drawer);

drawerLayer.render({
  children: <div>Drawer content here</div>
});
```

## TypeScript Support

Full TypeScript support with type inference:

```tsx
interface MyLayerProps {
  title: string;
  count: number;
}

const MyLayer: LC<MyLayerProps> = ({ title, count, layer }) => {
  // title and count are typed
  // layer is automatically typed
  return <div>{title}: {count}</div>;
};

const myLayer = createLayer(MyLayer);

// Type-safe render
myLayer.render({ title: 'Hello', count: 42 }); // ✓
myLayer.render({ title: 'Hello' }); // ✗ Error: count is required
```

