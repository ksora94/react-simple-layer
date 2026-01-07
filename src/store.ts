import {type FC, useSyncExternalStore} from 'react';

export type Layer<T = any> = {
  key: string;
  component: FC<T>
  destroy(): void;
  props?: T;
}

export const LayerStore: {
  layers: Layer[],
  listeners: Set<() => void>,
  add(layer: Layer): void,
  destroy(key: string): void,
  notify(): void,
} = {
  layers: [],
  listeners: new Set(),
  add(layer) {
    LayerStore.layers = [...LayerStore.layers, layer];
    LayerStore.notify();
  },
  destroy(key) {
    LayerStore.layers = LayerStore.layers.filter(layer => layer.key !== key);
    LayerStore.notify();
  },
  notify() {
    LayerStore.listeners.forEach(listener => listener());
  }
};

export function useLayerStore() {
  const subscribe = (listener: () => void) => {
    LayerStore.listeners.add(listener);

    return () => {
      LayerStore.listeners.delete(listener);
    }
  }

  return useSyncExternalStore(subscribe, () => {
    return LayerStore.layers;
  })
}
