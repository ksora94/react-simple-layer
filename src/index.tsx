import React, { ComponentType, ReactInstance } from 'react';
import {createRoot, Root} from 'react-dom/client';

export function createRenderRoot(id = 'layer-root'): HTMLElement {
  let root = document.getElementById(id);

  if (root) return root;
  root = document.createElement('div');
  root.setAttribute('id', id);
  document.body.appendChild(root);

  return root;
}

export interface ILayer<P = {}> {
  /**
   * Child component instance
   * @note Only has a value when the child component is a class component
   */
  instance: ReactInstance | null;

  /**
   * render component
   * @param props Props passed to the child component
   */
  render(props?: Omit<P, 'layer'>): void;

  /**
   * Destroy component
   */
  destroy(): void;
  /**
   * Root html node layer mounted
   */
  root: HTMLElement;
  Root: Root | null
}

export type LayerComponentProps<P> = {
  layer?: ILayer<P>;
} & P;

export type LC<P> = ComponentType<LayerComponentProps<P>>;


/**
 * create layer
 * @param Component child component definition
 * @param root Root html node，default is #layer-root
 */
export default function createLayer<P>(
    Component: LC<P>,
    root?: HTMLElement | string
): ILayer<P> {
  const layer: ILayer<P> = {
    instance: null,
    render() {},
    root: typeof root === 'string' ? createRenderRoot(root) : root || createRenderRoot(),
    Root: null,
    destroy() {
      window.queueMicrotask(() => {
        const { root, Root } = layer;

        Root?.unmount();
        layer.instance = null;
        if (root.parentNode && !root.children.length)
          root.parentNode.removeChild(root);
      })
    }
  };

  layer.Root = createRoot(layer.root);

  function createElement(Comp: any, props: P) {
    function ref(layerComponent: ReactInstance | null) {
      if (layerComponent) layer.instance = layerComponent;
    }

    return Comp.prototype && Comp.prototype.render ? (
        <Comp ref={ref} layer={layer} {...props} />
  ) : (
        <Comp layer={layer} {...props} />
  );
  }

  layer.render = function (props: P) {
    return layer.Root?.render(createElement(Component, props));
  };
  return layer;
}
