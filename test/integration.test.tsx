import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { LayerRoot } from '../src/Layer';
import { LayerStore } from '../src/store';
import { createLayer, LC } from '../src/utils';

describe('Integration tests', () => {
  beforeEach(() => {
    LayerStore.layers = [];
    LayerStore.listeners.clear();

    const existingRoot = document.getElementById('layer-root');
    if (existingRoot) {
      existingRoot.remove();
    }
  });

  afterEach(() => {
    const root = document.getElementById('layer-root');
    if (root) {
      root.remove();
    }
  });

  describe('Complete layer lifecycle', () => {
    it('create -> render -> destroy', () => {
      interface ModalProps {
        title: string;
      }

      const Modal: LC<ModalProps> = ({ title, layer }) => (
        <div data-testid="modal">
          <h1 data-testid="modal-title">{title}</h1>
          <button onClick={layer.destroy} data-testid="close-btn">
            Close
          </button>
        </div>
      );

      const modalInstance = createLayer(Modal, 'modal-1');

      // Render LayerRoot
      render(<LayerRoot />);

      // Initial state: no modal
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();

      // Render modal
      act(() => {
        modalInstance.render({ title: 'Test Modal' });
      });

      // Modal should appear
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Test Modal');

      // Click close button
      screen.getByTestId('close-btn').click();

      // Modal should be destroyed
      expect(LayerStore.layers).toHaveLength(0);
    });

    it('independent management of multiple layers', () => {
      const Layer1: LC<{ text: string }> = ({ text, layer }) => (
        <div data-testid="layer-1">
          {text}
          <button onClick={layer.destroy} data-testid="destroy-1">Destroy 1</button>
        </div>
      );

      const Layer2: LC<{ text: string }> = ({ text, layer }) => (
        <div data-testid="layer-2">
          {text}
          <button onClick={layer.destroy} data-testid="destroy-2">Destroy 2</button>
        </div>
      );

      const instance1 = createLayer(Layer1, 'layer-1');
      const instance2 = createLayer(Layer2, 'layer-2');

      render(<LayerRoot />);

      // Render two layers
      act(() => {
        instance1.render({ text: 'First Layer' });
        instance2.render({ text: 'Second Layer' });
      });

      expect(screen.getByTestId('layer-1')).toHaveTextContent('First Layer');
      expect(screen.getByTestId('layer-2')).toHaveTextContent('Second Layer');
      expect(LayerStore.layers).toHaveLength(2);

      // Use instance's destroy method instead of clicking button
      instance1.destroy();

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('layer-2');

      // 销毁第二个
      instance2.destroy();

      expect(LayerStore.layers).toHaveLength(0);
    });
  });

  describe('Real-world use cases', () => {
    it('simulate Modal dialog', async () => {
      interface ModalProps {
        title: string;
        content: string;
        onConfirm?: () => void;
      }

      const Modal: LC<ModalProps> = ({ title, content, onConfirm, layer }) => (
        <div data-testid="modal" className="modal">
          <div className="modal-content">
            <h2 data-testid="modal-title">{title}</h2>
            <p data-testid="modal-content">{content}</p>
            <div className="modal-actions">
              <button
                onClick={() => {
                  onConfirm?.();
                  layer.destroy?.();
                }}
                data-testid="confirm-btn"
              >
                Confirm
              </button>
              <button onClick={layer.destroy} data-testid="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      );

      const modalLayer = createLayer(Modal);

      render(<LayerRoot />);

      // Initial state
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();

      // Render modal
      let confirmed = false;
      act(() => {
        modalLayer.render({
          title: 'Confirm Action',
          content: 'Are you sure you want to proceed?',
          onConfirm: () => { confirmed = true; },
        });
      });

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Confirm Action');

      const user = userEvent.setup();

      // Click confirm
      await user.click(screen.getByTestId('confirm-btn'));

      expect(confirmed).toBe(true);
      expect(LayerStore.layers).toHaveLength(0);
    });

    it('simulate Toast notification', () => {
      interface ToastProps {
        message: string;
        type: 'success' | 'error' | 'info';
      }

      const Toast: LC<ToastProps> = ({ message, type, layer }) => (
        <div data-testid={`toast-${type}`} className={`toast toast-${type}`}>
          <span data-testid="toast-message">{message}</span>
          <button onClick={layer.destroy} data-testid="toast-close">
            ×
          </button>
        </div>
      );

      const toastLayer = createLayer(Toast);

      render(<LayerRoot />);

      // Show success toast
      act(() => {
        toastLayer.render({
          message: 'Operation successful!',
          type: 'success',
        });
      });

      expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Operation successful!');

      // Close toast
      screen.getByTestId('toast-close').click();

      expect(LayerStore.layers).toHaveLength(0);
    });

    it('simulate sidebar Drawer', () => {
      interface DrawerProps {
        title: string;
        position: 'left' | 'right';
        children?: React.ReactNode;
      }

      const Drawer: LC<DrawerProps> = ({ title, position, children, layer }) => (
        <div data-testid="drawer" className={`drawer drawer-${position}`}>
          <header data-testid="drawer-header">
            <h2>{title}</h2>
            <button onClick={layer.destroy} data-testid="drawer-close">
              Close
            </button>
          </header>
          <div data-testid="drawer-content">{children}</div>
        </div>
      );

      const drawerLayer = createLayer(Drawer, 'main-drawer');

      render(<LayerRoot />);

      // Open drawer
      act(() => {
        drawerLayer.render({
          title: 'Settings',
          position: 'right',
          children: <div data-testid="drawer-body">Drawer Content</div>,
        });
      });

      expect(screen.getByTestId('drawer')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-header')).toHaveTextContent('Settings');
      expect(screen.getByTestId('drawer-body')).toHaveTextContent('Drawer Content');

      // Close drawer
      screen.getByTestId('drawer-close').click();

      expect(LayerStore.layers).toHaveLength(0);
    });
  });

  describe('Multiple layer stacking', () => {
    it('should support multiple layers displayed simultaneously', () => {
      const Layer1: LC<{}> = () => <div data-testid="layer-1">Layer 1</div>;
      const Layer2: LC<{}> = () => <div data-testid="layer-2">Layer 2</div>;
      const Layer3: LC<{}> = () => <div data-testid="layer-3">Layer 3</div>;

      const instance1 = createLayer(Layer1);
      const instance2 = createLayer(Layer2);
      const instance3 = createLayer(Layer3);

      render(<LayerRoot />);

      act(() => {
        instance1.render({});
        instance2.render({});
        instance3.render({});
      });

      // All layers should be visible
      expect(screen.getByTestId('layer-1')).toBeInTheDocument();
      expect(screen.getByTestId('layer-2')).toBeInTheDocument();
      expect(screen.getByTestId('layer-3')).toBeInTheDocument();

      // Verify LayerStore has 3 layers
      expect(LayerStore.layers).toHaveLength(3);
    });

    it('Z-index stacking order', () => {
      const Modal1: LC<{ zIndex: number }> = ({ zIndex }) => (
        <div data-testid="modal-1" style={{ zIndex }}>
          Modal 1
        </div>
      );

      const Modal2: LC<{ zIndex: number }> = ({ zIndex }) => (
        <div data-testid="modal-2" style={{ zIndex }}>
          Modal 2
        </div>
      );

      const instance1 = createLayer(Modal1);
      const instance2 = createLayer(Modal2);

      render(<LayerRoot />);

      act(() => {
        instance1.render({ zIndex: 100 });
        instance2.render({ zIndex: 200 });
      });

      const modal1 = screen.getByTestId('modal-1');
      const modal2 = screen.getByTestId('modal-2');

      expect(modal1).toHaveStyle({ zIndex: '100' });
      expect(modal2).toHaveStyle({ zIndex: '200' });
    });
  });

  describe('Dynamic content updates', () => {
    it('layer internal state updates', async () => {
      const Counter: LC<{ initial: number }> = ({ initial, layer }) => {
        const [count, setCount] = useState(initial);

        return (
          <div data-testid="counter-layer">
            <p data-testid="count">{count}</p>
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              +
            </button>
            <button onClick={() => setCount(c => c - 1)} data-testid="decrement">
              -
            </button>
            <button onClick={layer.destroy} data-testid="close">
              Close
            </button>
          </div>
        );
      };

      const counterLayer = createLayer(Counter);

      render(<LayerRoot />);
      act(() => {
        counterLayer.render({ initial: 0 });
      });

      const user = userEvent.setup();

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      await user.click(screen.getByTestId('increment'));
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      await user.click(screen.getByTestId('increment'));
      await user.click(screen.getByTestId('increment'));
      expect(screen.getByTestId('count')).toHaveTextContent('3');

      await user.click(screen.getByTestId('decrement'));
      expect(screen.getByTestId('count')).toHaveTextContent('2');
    });
  });

  describe('Performance tests', () => {
    it('should handle large number of layers', () => {
      const SimpleLayer: LC<{ id: number }> = ({ id }) => (
        <div data-testid={`layer-${id}`}>Layer {id}</div>
      );

      render(<LayerRoot />);

      let instances: any[];
      act(() => {
        instances = Array.from({ length: 50 }, (_, i) => {
          const instance = createLayer(SimpleLayer, `layer-${i}`);
          instance.render({ id: i });
          return instance;
        });
      });

      expect(LayerStore.layers).toHaveLength(50);

      // Verify first and last
      expect(screen.getByTestId('layer-0')).toBeInTheDocument();
      expect(screen.getByTestId('layer-49')).toBeInTheDocument();

      // Batch delete
      act(() => {
        instances!.slice(0, 25).forEach(instance => instance.destroy());
      });

      expect(LayerStore.layers).toHaveLength(25);
    });
  });

  describe('Error handling', () => {
    it('render method does not throw error even if component has issues', () => {
      const GoodLayer: LC<{}> = () => <div data-testid="good-layer">Good</div>;
      const BadLayer: LC<{}> = () => {
        throw new Error('Component error');
      };

      const goodInstance = createLayer(GoodLayer);
      const badInstance = createLayer(BadLayer);

      // render method just adds to store, does not throw error
      expect(() => {
        goodInstance.render({});
      }).not.toThrow();

      expect(() => {
        badInstance.render({});
      }).not.toThrow();

      // Both layers are successfully added to store
      expect(LayerStore.layers).toHaveLength(2);

      // Note: Actually rendering BadLayer will throw error, here we only test render method itself
    });
  });

  describe('Custom root', () => {
    it('should support custom portal root', () => {
      const CustomLayer: LC<{}> = () => (
        <div data-testid="custom-layer">Custom Layer</div>
      );

      const instance = createLayer(CustomLayer);

      render(<LayerRoot root="custom-portal" />);
      act(() => {
        instance.render({});
      });

      const customRoot = document.getElementById('custom-portal');
      expect(customRoot).toBeInTheDocument();
      expect(screen.getByTestId('custom-layer')).toBeInTheDocument();

      // Cleanup
      customRoot?.remove();
    });
  });
});

