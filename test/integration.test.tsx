import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { LayerRoot } from '../src/Layer';
import { LayerStore } from '../src/store';
import { createLayer, LC } from '../src/utils';

describe('集成测试', () => {
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

  describe('完整的 Layer 生命周期', () => {
    it('创建 -> 渲染 -> 销毁', () => {
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

      // 渲染 LayerRoot
      render(<LayerRoot />);

      // 初始状态：没有 modal
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();

      // 渲染 modal
      act(() => {
        modalInstance.render({ title: 'Test Modal' });
      });

      // modal 应该出现
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Test Modal');

      // 点击关闭按钮
      screen.getByTestId('close-btn').click();

      // modal 应该被销毁
      expect(LayerStore.layers).toHaveLength(0);
    });

    it('多个 layers 的独立管理', () => {
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

      // 渲染两个 layers
      act(() => {
        instance1.render({ text: 'First Layer' });
        instance2.render({ text: 'Second Layer' });
      });

      expect(screen.getByTestId('layer-1')).toHaveTextContent('First Layer');
      expect(screen.getByTestId('layer-2')).toHaveTextContent('Second Layer');
      expect(LayerStore.layers).toHaveLength(2);

      // 使用实例的 destroy 方法而不是点击按钮
      instance1.destroy();

      expect(LayerStore.layers).toHaveLength(1);
      expect(LayerStore.layers[0].key).toBe('layer-2');

      // 销毁第二个
      instance2.destroy();

      expect(LayerStore.layers).toHaveLength(0);
    });
  });

  describe('实际使用场景', () => {
    it('模拟 Modal 对话框', async () => {
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
                  layer.destroy();
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

      // 初始状态
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();

      // 渲染 modal
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

      // 点击确认
      await user.click(screen.getByTestId('confirm-btn'));

      expect(confirmed).toBe(true);
      expect(LayerStore.layers).toHaveLength(0);
    });

    it('模拟 Toast 通知', () => {
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

      // 显示成功 toast
      act(() => {
        toastLayer.render({
          message: 'Operation successful!',
          type: 'success',
        });
      });

      expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Operation successful!');

      // 关闭 toast
      screen.getByTestId('toast-close').click();

      expect(LayerStore.layers).toHaveLength(0);
    });

    it('模拟侧边栏 Drawer', () => {
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

      // 打开 drawer
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

      // 关闭 drawer
      screen.getByTestId('drawer-close').click();

      expect(LayerStore.layers).toHaveLength(0);
    });
  });

  describe('多 layer 堆叠', () => {
    it('应该支持多个 layers 同时显示', () => {
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

      // 所有 layers 都应该可见
      expect(screen.getByTestId('layer-1')).toBeInTheDocument();
      expect(screen.getByTestId('layer-2')).toBeInTheDocument();
      expect(screen.getByTestId('layer-3')).toBeInTheDocument();

      // 验证 LayerStore 中有 3 个 layers
      expect(LayerStore.layers).toHaveLength(3);
    });

    it('Z-index 堆叠顺序', () => {
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

  describe('动态内容更新', () => {
    it('layer 内部状态更新', async () => {
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

  describe('性能测试', () => {
    it('应该能处理大量 layers', () => {
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

      // 验证第一个和最后一个
      expect(screen.getByTestId('layer-0')).toBeInTheDocument();
      expect(screen.getByTestId('layer-49')).toBeInTheDocument();

      // 批量删除
      act(() => {
        instances!.slice(0, 25).forEach(instance => instance.destroy());
      });

      expect(LayerStore.layers).toHaveLength(25);
    });
  });

  describe('错误处理', () => {
    it('render 方法不会抛出错误，即使组件本身有问题', () => {
      const GoodLayer: LC<{}> = () => <div data-testid="good-layer">Good</div>;
      const BadLayer: LC<{}> = () => {
        throw new Error('Component error');
      };

      const goodInstance = createLayer(GoodLayer);
      const badInstance = createLayer(BadLayer);

      // render 方法只是添加到 store，不会抛出错误
      expect(() => {
        goodInstance.render({});
      }).not.toThrow();

      expect(() => {
        badInstance.render({});
      }).not.toThrow();

      // 两个 layer 都被成功添加到 store
      expect(LayerStore.layers).toHaveLength(2);

      // 注意：实际渲染 BadLayer 会抛出错误，这里我们只测试 render 方法本身
    });
  });

  describe('自定义 root', () => {
    it('应该支持自定义 portal root', () => {
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

      // 清理
      customRoot?.remove();
    });
  });
});

