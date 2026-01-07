import React from 'react';
import {createPortal} from 'react-dom';
import {useLayerStore} from './store';

function createRenderRoot(id: string): HTMLElement {
  let root = document.getElementById(id);

  if (root) return root;
  root = document.createElement('div');
  root.setAttribute('id', id);
  document.body.appendChild(root);

  return root;
}

export interface LayerRootProps {
  root?: string
}

export const LayerRoot: React.FC<LayerRootProps> = ({root = 'layer-root'}) => {
  const store = useLayerStore()


  return createPortal(
      store.map(layer => React.createElement(layer.component, {
        ...layer.props,
        key: layer.key,
      })),
      createRenderRoot(root)
  )
}
