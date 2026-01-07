import {type Layer, LayerStore} from './store';
import {type FC} from 'react';

export interface LayerProps {
  layer: Layer;
}

export type LC<T> = FC<T & LayerProps>

export type LayerInstance<T> = {
  layer: Layer;
  render(props?: Omit<T, keyof LayerProps>): void;
  destroy(): void;
}

export function createLayer<T = any>(Component: LC<T>, key?: string): LayerInstance<T> {
  const layer: Layer = {
    key: key || Math.random().toString(16).slice(2),
    destroy() {
      LayerStore.destroy(layer.key);
    },
    component: props => {
      return <Component layer={layer} {...props}/>
    }
  }


  const render = (props = {}) => {
    LayerStore.add({
      ...layer,
      props
    });
  }

  const destroy = () => {
    LayerStore.destroy(layer.key);
  }

  return {
    layer,
    render,
    destroy,
  };
}
