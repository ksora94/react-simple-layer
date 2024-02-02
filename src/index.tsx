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
   * 子组件实例
   * @note 只有当子组件为类组件时才有值
   */
  instance: ReactInstance | null;

  /**
   * 挂载组件
   * @param props 给子组件传递的props
   */
  render(props?: Omit<P, 'layer'>): void;

  /**
   * 销毁组件
   */
  destroy(): void;
  /**
   * 组件挂载根节点
   */
  root: HTMLElement;
  Root: Root | null
}

export type LayerComponentProps<P> = {
  layer?: ILayer<P>;
} & P;

export type LC<P> = ComponentType<LayerComponentProps<P>>;


/**
 * 创建浮层
 * @param Component 子组件引用
 * @param root 挂载的根节点，默认#layer-root
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
