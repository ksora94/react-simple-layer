# react-simple-layer
A simple way to create a react layer.

## install

```bash
npm install react-simple-layer
```

## createLayer

```typescript
function createLayer<P>(Component: LC<P>, root?: HTMLElement | string): ILayer<P>
```

### Parameters

- `Component: LC<P>`: The child component definition. This is a React component that accepts a special prop `layer`, which is an `ILayer` object.

- `root: HTMLElement | string` (optional): The root HTML node. If a string is provided, it will attempt to find an element in the document with that string as its ID. If no element is found, or if `root` is not provided, a new div element will be created with its ID set to 'layer-root'.

### Return Value

Returns an `ILayer<P>` object, which includes the following properties and methods:

- `instance: ReactInstance | null`: The child component instance. This value is only present when the child component is a class component.

- `render(props?: Omit<P, 'layer'>): void`: A method to render the component. It accepts a `props` parameter, which are the props passed to the child component.

- `destroy(): void`: A method to destroy the component. When this method is called, the component will be unmounted and the root node will be removed from the DOM.

- `root: HTMLElement`: The root HTML node where the layer is mounted.

- `Root: Root | null`: The root instance of React.

### Example

```typescript
import React from 'react';
import createLayer, { LC, ILayer } from './createLayer';

const ChildComponent: LC<{title: string}> = ({ title, layer }) => {
  return <div>{title}</div>;
};

const layer: ILayer = createLayer(ChildComponent);

layer.render({
    title: 'Hello, World!'
});

layer.destroy();

// or

createLayer<{
  title: string
}>(({ title, layer }) => {
  return <div>{title}</div>
}).render({
  title: 'Hello, World!'
});
```
